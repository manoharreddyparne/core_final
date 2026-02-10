# users/views/admin_auth_views.py
import logging
from datetime import datetime, timezone as dt_timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.identity.models import User, RememberedDevice
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.services.auth_service import handle_login
from apps.identity.services.brute_force_service import (
    check_brute_force,
    register_failed_attempt,
    clear_failed_attempt,
)
from apps.identity.utils.otp_utils import send_otp_secure, verify_otp_for_user
from apps.identity.utils.device_utils import get_device_hash
from apps.identity.utils.cookie_utils import set_refresh_cookie
from apps.identity.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


def _normalized_login_payload(user: User, access: str) -> dict:
    """
    Match student login response shape for FE consistency.
    """
    return {
        "access": access,
        "refresh_token_present": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "role": getattr(user, "role", None),
        },
    }


# -------------------------------
# Admin / Teacher Login (Adaptive 2FA)
# -------------------------------
class AdminTokenObtainPairView(TokenObtainPairView):
    """
    Handles admin/teacher login with optional OTP challenge on untrusted devices.
    """
    serializer_class = None  # handled dynamically

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        login_field = request.data.get("username") or request.data.get("email")
        password = request.data.get("password")

        if not login_field or not password:
            return error_response("username/email + password required", status_code=400)

        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
        device_hash = get_device_hash(ip, user_agent)

        # ---------- Brute-force check ----------
        brute_status = check_brute_force(login_field, ip)
        if brute_status.get("blocked"):
            return error_response(
                f"Too many failed login attempts. Try again after {brute_status['cooldown']}s.",
                status_code=429,
            )

        # ---------- User lookup (admin+teacher only) ----------
        user = User.objects.filter(
            Q(username__iexact=login_field) | Q(email__iexact=login_field),
            role__in=[User.Roles.ADMIN, User.Roles.TEACHER],
        ).first()

        # Avoid enumeration/timing leaks: generic error on bad creds/role mismatch
        if not user or not user.check_password(password):
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] fail login_field={login_field} ip={ip}")
            return error_response("Invalid credentials", status_code=401)

        # ✅ Good creds → clear fail attempts
        clear_failed_attempt(login_field, ip)

        # ---------- Check trusted device ----------
        trusted = RememberedDevice.objects.filter(
            user=user, device_hash=device_hash, trusted=True
        ).exists()

        # ---------- Require OTP if not trusted ----------
        if not trusted:
            send_otp_secure(user)
            logger.info(f"[ADMIN-LOGIN] OTP sent user={user.id} ip={ip}")
            return success_response(
                "OTP required",
                data={"require_otp": True, "user_id": user.id},
            )

        # ---------- Trusted → Complete login ----------
        try:
            token_data = handle_login(
                user,
                password,
                ip,
                user_agent,
                request=request,
                role_context="admin",   # enforce admin/teacher serializer
            )
        except Exception as e:
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] denied login_field={login_field} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", status_code=401)

        # token_data contains {"refresh","access",...}; set cookie + normalize payload
        access = token_data.get("access")
        refresh = token_data.get("refresh")

        resp = success_response("Login OK", data=_normalized_login_payload(user, access))
        set_refresh_cookie(resp, str(refresh))  # set RT cookie like student flow
        logger.info(f"[ADMIN-LOGIN] ✅ user={user.id} ip={ip} trusted=1")
        return resp


# -------------------------------
# OTP Verification for Admin/Teacher
# -------------------------------
class AdminVerifyOTPView(APIView):
    """
    Verifies OTP for admin/teacher and marks device as trusted.
    """
    authentication_classes = []
    permission_classes = []

    @method_decorator(csrf_exempt)
    def post(self, request):
        user_id = request.data.get("user_id")
        otp_code = request.data.get("otp")
        password = request.data.get("password")

        if not (user_id and otp_code and password):
            return error_response("user_id, otp, and password required.", status_code=400)

        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
        device_hash = get_device_hash(ip, user_agent)

        # ---------- User lookup ----------
        try:
            user = User.objects.get(
                id=user_id,
                role__in=[User.Roles.ADMIN, User.Roles.TEACHER],  # role-bound
            )
        except User.DoesNotExist:
            return error_response("Invalid user", status_code=400)

        # ---------- Verify OTP ----------
        if not verify_otp_for_user(user, otp_code):
            logger.warning(f"[ADMIN-OTP] invalid OTP user={user.id} ip={ip}")
            return error_response("Invalid or expired OTP.", status_code=401)

        # ---------- Mark device trusted ----------
        RememberedDevice.objects.update_or_create(
            user=user,
            device_hash=device_hash,
            defaults={
                "trusted": True,
                "last_active": datetime.now(tz=dt_timezone.utc),  # ✅ matches model field
                "ip_address": ip,
                "user_agent": user_agent,
            },
        )

        # ---------- Complete login ----------
        try:
            token_data = handle_login(
                user,
                password,
                ip,
                user_agent,
                request=request,
                role_context="admin",   # enforce correct serializer
            )
        except Exception as e:
            logger.warning(f"[ADMIN-OTP] login denied user={user.id} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", status_code=401)

        access = token_data.get("access")
        refresh = token_data.get("refresh")

        resp = success_response("Login OK", data=_normalized_login_payload(user, access))
        set_refresh_cookie(resp, str(refresh))  # set RT after OTP flow
        logger.info(f"[ADMIN-OTP] ✅ user={user.id} ip={ip} trusted=1")
        return resp

# users/views/admin_auth_views.py
import logging
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.conf import settings
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
from apps.identity.utils.cookie_utils import (
    set_logged_in_cookie,
)
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, burn_jit_admin_ticket
from apps.identity.utils.trust_utils import (
    is_device_trusted,
    trust_device,
    set_trust_cookie,
)

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
            return error_response("username/email + password required", code=400)

        ip = get_client_ip(request)
        logger.info(f"[SEC-DEBUG] Login attempt from IP: {ip}")
        
        # ✅ Global security check (Platform-wide IP lockout)
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            logger.warning(f"[SEC-GATE] Blocked login attempt from IP: {ip}")
            return error_response(
                f"Brute force detected. Your IP is blocked for {lockout_time // 60} minutes for security reasons.",
                code=403,
                data={"lockout_timer": lockout_time}
            )
        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
        device_hash = get_device_hash(ip, user_agent)

        # ---------- Brute-force check ----------
        brute_status = check_brute_force(login_field, ip)
        if brute_status.get("blocked"):
            return error_response(
                f"Too many failed login attempts. Try again after {brute_status['cooldown']}s.",
                code=429,
            )

        # ---------- User lookup (admin+teacher only) ----------
        user = User.objects.filter(
            Q(username__iexact=login_field) | Q(email__iexact=login_field),
            role__in=[User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN, User.Roles.ADMIN, User.Roles.TEACHER],
        ).first()

        # Avoid enumeration/timing leaks: generic error on bad creds/role mismatch
        if not user or not user.check_password(password):
            attempts_left = register_global_failure(ip, user_agent, login_field)
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] fail login_field={login_field} ip={ip} attempts_left={attempts_left}")

            # 🔥 IP locked out → burn JIT ticket to force fresh link
            if attempts_left <= 0:
                jit_ticket = request.data.get("jit_ticket")
                if jit_ticket:
                    burn_jit_admin_ticket(jit_ticket)
                    logger.error(f"[SEC-GATE] IP locked out. JIT ticket RECALLED for IP={ip}")
                return error_response(
                    "Brute force detected. Your IP is blocked for 10 minutes for security reasons.",
                    code=403,
                    data={"lockout_timer": 600}
                )

            # Professional message progression
            if attempts_left <= 2:
                msg = f"Invalid credentials. Warning: {attempts_left} attempt{'s' if attempts_left != 1 else ''} remaining before total IP lockout."
            else:
                msg = "Invalid credentials. Please check your email or password."

            return error_response(msg, code=401, data={"attempts_remaining": attempts_left})

        # ✅ JIT TICKET ENFORCEMENT FOR SUPER ADMIN (Password Stage)
        if user.role == User.Roles.SUPER_ADMIN:
            jit_ticket = request.data.get("jit_ticket")
            institution_id = request.data.get("institution_id")

            if institution_id:
                logger.info(f"[SEC-GATE] SuperAdmin Scoped Login for Inst={institution_id}. JIT Bypassed.")
            else:
                logger.info(f"[SEC-DEBUG] SuperAdmin JIT Ticket received: {jit_ticket[:10] if jit_ticket else 'NONE'}...")
                if not jit_ticket or not verify_jit_admin_ticket(jit_ticket, email=user.email):
                    logger.warning(f"[SEC-GATE] SuperAdmin login attempt WITHOUT valid JIT ticket. User={user.id} IP={ip}")
                    return error_response("Infrastructure Protocol Violation. Identity Access Revoked.", code=403)

                # ✅ Store a short-lived OTP session proof so the OTP stage
                # does NOT need to re-verify the same JIT ticket (avoids false rejections).
                from django.core.cache import cache as dj_cache
                otp_session_key = f"jit_otp_session:{user.id}"
                dj_cache.set(otp_session_key, jit_ticket, timeout=600)  # 10-min window to enter OTP
                logger.info(f"[SEC-GATE] JIT OTP session created for user={user.id}")

        # ✅ Good creds → clear fail attempts
        clear_failed_attempt(login_field, ip)

        # ---------- Check trusted device (DB + Browser Cookie) ----------
        trusted = is_device_trusted(request, user=user, device_hash=device_hash, role=user.role)

        # ---------- Require OTP if not trusted ----------
        if not trusted:
            send_otp_secure(user)
            logger.info(f"[ADMIN-LOGIN] OTP sent user={user.id} ip={ip}")
            return success_response(
                "OTP required",
                data={
                    "require_otp": True, 
                    "user_id": user.id,
                    "email_hint": user.email[:2] + "***" + user.email[user.email.find("@"):]
                },
            )

        # ✅ INSTITUTION VALIDATION (For Institutional Admins)
        institution_id = request.data.get("institution_id")
        if user.role == User.Roles.INSTITUTION_ADMIN and institution_id:
            from apps.identity.models.institution import InstitutionAdmin
            linked = InstitutionAdmin.objects.filter(user=user, institution_id=institution_id).exists()
            if not linked:
                logger.warning(f"[SEC-GATE] Institutional Admin {user.email} attempted access to UNAUTHORIZED institution ID={institution_id}")
                return error_response("Identity Breach: Unauthorized access to this institution.", code=403)

        # Prepare custom claims for Institutional Admin context
        custom_claims = None
        if institution_id:
            from apps.identity.models.institution import Institution
            inst = Institution.objects.filter(id=institution_id).first()
            if inst:
                custom_claims = {
                    "schema": inst.schema_name,
                    "role": "INSTITUTION_ADMIN",
                    "email": user.email
                }

        # ---------- Trusted → Complete login ----------
        from rest_framework.exceptions import AuthenticationFailed
        try:
            token_data = handle_login(
                user,
                password,
                ip,
                user_agent,
                request=request,
                role_context="admin",   # enforce admin/teacher serializer
                custom_claims=custom_claims
            )
        except AuthenticationFailed as ae:
            return error_response(str(ae), code=401)
        except Exception as e:
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] denied login_field={login_field} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", code=401)

        # BURN JIT TICKET ON SUCCESS
        if user.role == User.Roles.SUPER_ADMIN:
            jit_ticket = request.data.get("jit_ticket") or request.data.get("ticket")
            institution_id = request.data.get("institution_id")
            
            logger.info(f"[SEC-GATE] Super Admin post-login JIT check: jit_ticket={bool(jit_ticket)}, inst_id={institution_id}")
            if not institution_id and jit_ticket:
                burn_jit_admin_ticket(jit_ticket)
                logger.info(f"[SEC-GATE] SuperAdmin JIT ticket burned user={user.id}")

        access = token_data.get("access")

        resp = success_response("Login OK", data=_normalized_login_payload(user, access))
        
        # ✅ Set 4-segment Quantum Shield
        from apps.identity.utils.cookie_utils import set_quantum_shield
        set_quantum_shield(resp, token_data.get("fragments", {}))
        set_logged_in_cookie(resp, "true", role=user.role)
        
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
            return error_response("user_id, otp, and password required.", code=400)

        ip = get_client_ip(request)
        
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            return error_response(
                f"Brute force detected. Your IP is blocked for {lockout_time // 60} minutes for security reasons.",
                code=403,
                data={"lockout_timer": lockout_time}
            )

        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
        device_hash = get_device_hash(ip, user_agent)
        jit_ticket = request.data.get("jit_ticket")

        # ---------- User lookup ----------
        try:
            user = User.objects.get(
                id=user_id,
                role__in=[User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN, User.Roles.ADMIN, User.Roles.TEACHER],
            )
        except User.DoesNotExist:
            return error_response("Invalid user", code=400)

        # ---------- Verify OTP ----------
        if not verify_otp_for_user(user, otp_code):
            attempts_left = register_global_failure(ip, user_agent, f"USER_ID:{user_id}")
            if attempts_left <= 0:
                jit_ticket = request.data.get("jit_ticket")
                if jit_ticket:
                    burn_jit_admin_ticket(jit_ticket)
            return error_response("Invalid or expired OTP.", code=401, data={"attempts_remaining": attempts_left})


        # ✅ OTP PASSED → clear failure counters
        from apps.identity.services.security_service import clear_global_failures
        clear_global_failures(ip)
        clear_failed_attempt(f"USER_ID:{user_id}", ip)

        # ✅ JIT TICKET ENFORCEMENT FOR SUPER ADMIN
        if user.role == User.Roles.SUPER_ADMIN:
            institution_id = request.data.get("institution_id")
            if not institution_id:
                from django.core.cache import cache as dj_cache
                otp_session_key = f"jit_otp_session:{user.id}"
                stored_ticket = dj_cache.get(otp_session_key)
                if not stored_ticket:
                    return error_response("Security session expired. Please request a new access link.", code=403)
                jit_ticket = stored_ticket

        # ---------- Mark device trusted ----------
        should_trust = request.data.get("remember_device", False)
        trust_token = None
        if should_trust:
            trust_token = trust_device(user=user, device_hash=device_hash, ip=ip, user_agent=user_agent, role=user.role)

        # ---------- Complete login ----------
        from rest_framework.exceptions import AuthenticationFailed
        try:
            token_data = handle_login(
                user,
                password,
                ip,
                user_agent,
                request=request,
                role_context="admin",
            )
        except AuthenticationFailed as ae:
            return error_response(str(ae), code=401)
        except Exception as e:
            return error_response("Invalid credentials", code=401)

        access = token_data.get("access")
        resp = success_response("Login OK", data=_normalized_login_payload(user, access))

        from apps.identity.utils.cookie_utils import set_quantum_shield
        set_quantum_shield(resp, token_data.get("fragments", {}))
        set_logged_in_cookie(resp, "true", role=user.role)

        if should_trust and trust_token:
            set_trust_cookie(resp, trust_token)

        # BURN JIT TICKET ON SUCCESS
        if user.role == User.Roles.SUPER_ADMIN:
            institution_id = request.data.get("institution_id")
            if not institution_id and jit_ticket:
                burn_jit_admin_ticket(jit_ticket)
                from django.core.cache import cache as dj_cache
                dj_cache.delete(f"jit_otp_session:{user.id}")

        return resp


class AdminResendOTPView(APIView):
    """
    Resends OTP for admin/teacher with a 5-minute cooldown.
    """
    authentication_classes = []
    permission_classes = []

    @method_decorator(csrf_exempt)
    def post(self, request):
        user_id = request.data.get("user_id")
        ip = get_client_ip(request)

        from apps.identity.services.security_service import is_ip_blocked
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            return error_response(f"IP blocked for {lockout_time // 60} minutes.", code=403)

        try:
            user = User.objects.get(id=user_id, role__in=[User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN, User.Roles.ADMIN, User.Roles.TEACHER])
        except User.DoesNotExist:
            return error_response("Invalid user", code=400)

        from django.core.cache import cache
        cooldown_key = f"otp_resend_cooldown_{user.id}"
        remaining = cache.ttl(cooldown_key)
        
        if remaining > 0:
            return error_response("Please wait before requesting a new OTP.", code=429, data={"cooldown": remaining})

        send_otp_secure(user)
        cache.set(cooldown_key, True, 300)
        return success_response("Security token resent.")

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
    MAX_FAILED_ATTEMPTS,
)
from apps.identity.utils.otp_utils import send_otp_secure, verify_otp_for_user
from apps.identity.utils.device_utils import get_device_hash
from apps.identity.utils.cookie_utils import (
    set_logged_in_cookie,
)
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, burn_jit_admin_ticket

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
        from apps.identity.services.security_service import get_ip_lockout_status, register_global_failure
        lockout = get_ip_lockout_status(ip)
        if lockout["blocked"]:
            logger.warning(f"[SEC-GATE] Blocked login attempt from IP: {ip}")
            mins, secs = divmod(lockout["remaining"], 60)
            return error_response(
                f"Access Revoked. Your IP has been temporarily locked. Re-accessing allowed in {mins:02d}:{secs:02d}.",
                code=403,
                data={"lockout_timer": lockout["remaining"]}
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
            fail_count = register_global_failure(ip, user_agent, login_field)
            attempts_left = MAX_FAILED_ATTEMPTS - fail_count
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] fail login_field={login_field} ip={ip} attempts_left={attempts_left}")
            
            # 🔥 Requirement: Burn JIT if IP is locked out
            if attempts_left <= 0:
                jit_ticket = request.data.get("jit_ticket")
                if jit_ticket:
                    burn_jit_admin_ticket(jit_ticket)
                    logger.error(f"[SEC-GATE] Sustained attack detected. JIT ticket RECALLED for IP={ip}")
            
            msg = "Invalid credentials"
            if attempts_left <= 2 and attempts_left > 0:
                msg = f"Invalid credentials. Warning: {attempts_left} attempts remaining before total IP lockout."
            elif attempts_left <= 0:
                msg = "Access Revoked. IP Blacklisted."

            return error_response(msg, code=401, data={"attempts_remaining": attempts_left})

        # ✅ JIT TICKET ENFORCEMENT FOR SUPER ADMIN
        if user.role == User.Roles.SUPER_ADMIN:
            jit_ticket = request.data.get("jit_ticket")
            logger.info(f"[SEC-DEBUG] SuperAdmin JIT Ticket received: {jit_ticket[:10] if jit_ticket else 'NONE'}...")
            if not jit_ticket or not verify_jit_admin_ticket(jit_ticket, email=user.email):
                logger.warning(f"[SEC-GATE] SuperAdmin login attempt WITHOUT valid JIT ticket. User={user.id} IP={ip}")
                return error_response("Infrastructure Protocol Violation. Identity Access Revoked.", code=403)
            # We will burn it after successful full authentication (below)

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
        from rest_framework.exceptions import AuthenticationFailed
        try:
            token_data = handle_login(
                user,
                password,
                ip,
                user_agent,
                request=request,
                role_context="admin",   # enforce admin/teacher serializer
            )
        except AuthenticationFailed as ae:
            # Propagate specific auth errors (like cooldown) to the user
            return error_response(str(ae), code=401)
        except Exception as e:
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] denied login_field={login_field} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", code=401)

        # BURN JIT TICKET ON SUCCESS
        if user.role == User.Roles.SUPER_ADMIN:
            jit_ticket = request.data.get("jit_ticket")
            if jit_ticket:
                burn_jit_admin_ticket(jit_ticket)
                logger.info(f"[SEC-GATE] SuperAdmin JIT ticket burned user={user.id}")

        # token_data contains {"refresh","access",...}; set cookie + normalize payload
        access = token_data.get("access")
        refresh = token_data.get("refresh")

        resp = success_response("Login OK", data=_normalized_login_payload(user, access))
        
        # ✅ Set 4-segment Quantum Shield
        from apps.identity.utils.cookie_utils import set_quantum_shield
        set_quantum_shield(resp, token_data.get("fragments", {}))
        
        set_logged_in_cookie(resp, "true")
        
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
        
        # ✅ Global security check
        from apps.identity.services.security_service import get_ip_lockout_status, register_global_failure
        lockout = get_ip_lockout_status(ip)
        if lockout["blocked"]:
            logger.warning(f"[SEC-GATE] Blocked OTP attempt from IP: {ip}")
            mins, secs = divmod(lockout["remaining"], 60)
            return error_response(
                f"Access Revoked. IP Blacklisted. Re-accessing allowed in {mins:02d}:{secs:02d}.",
                code=403,
                data={"lockout_timer": lockout["remaining"]}
            )

        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")
        device_hash = get_device_hash(ip, user_agent)
        
        jit_ticket = request.data.get("jit_ticket")

        # ---------- User lookup ----------
        try:
            user = User.objects.get(
                id=user_id,
                role__in=[User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN, User.Roles.ADMIN, User.Roles.TEACHER],  # role-bound
            )
        except User.DoesNotExist:
            return error_response("Invalid user", code=400)

        # ---------- Verify OTP ----------
        if not verify_otp_for_user(user, otp_code):
            fail_count = register_global_failure(ip, user_agent, f"USER_ID:{user_id}")
            attempts_left = MAX_FAILED_ATTEMPTS - fail_count
            logger.warning(f"[ADMIN-OTP] invalid OTP user={user.id} ip={ip} attempts_left={attempts_left}")
            
            # 🔥 Requirement: Burn JIT if IP is locked out
            if attempts_left <= 0 and jit_ticket:
                burn_jit_admin_ticket(jit_ticket)
                logger.error(f"[SEC-GATE] Sustained attack detected during MFA. JIT ticket RECALLED for IP={ip}")

            msg = "Invalid or expired OTP."
            if attempts_left <= 2:
                msg = f"Invalid OTP. Warning: {attempts_left} attempts remaining."
            return error_response(msg, code=401, data={"attempts_remaining": attempts_left})

        # ✅ JIT TICKET ENFORCEMENT FOR SUPER ADMIN (Final Stage)
        if user.role == User.Roles.SUPER_ADMIN:
            logger.info(f"[SEC-DEBUG] SuperAdmin OTP stage JIT Ticket received: {jit_ticket[:10] if jit_ticket else 'NONE'}...")
            if not jit_ticket or not verify_jit_admin_ticket(jit_ticket, email=user.email):
                logger.warning(f"[SEC-GATE] SuperAdmin OTP attempt WITHOUT valid JIT ticket. User={user.id} IP={ip}")
                return error_response("Infrastructure Protocol Violation. Identity Access Revoked.", code=403)

        # ---------- Mark device trusted ----------
        should_trust = request.data.get("remember_device", False)
        
        RememberedDevice.objects.update_or_create(
            user=user,
            device_hash=device_hash,
            defaults={
                "trusted": should_trust,
                "last_active": datetime.now(tz=dt_timezone.utc),
                "ip_address": ip,
                "user_agent": user_agent,
            },
        )

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
            logger.warning(f"[ADMIN-OTP] login denied user={user.id} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", code=401)

        access = token_data.get("access")
        resp = success_response("Login OK", data=_normalized_login_payload(user, access))
        
        # ✅ Set 4-segment Quantum Shield
        from apps.identity.utils.cookie_utils import set_quantum_shield
        set_quantum_shield(resp, token_data.get("fragments", {}))
        set_logged_in_cookie(resp, "true")
        
        # BURN JIT TICKET ON SUCCESS & Reset Cooldown
        if user.role == User.Roles.SUPER_ADMIN:
            if jit_ticket:
                from apps.identity.utils.jit_admin import burn_jit_admin_ticket
                burn_jit_admin_ticket(jit_ticket)
                # ✅ Requirement: Reset JIT cooldown on success
                from django.core.cache import cache
                cache.delete(f"jit_burst_{user.email.lower().strip()}")
                logger.info(f"[SEC-GATE] SuperAdmin JIT burned & cooldown reset user={user.id}")

        logger.info(f"[ADMIN-OTP] ✅ user={user.id} ip={ip} trusted={should_trust}")
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

        # ✅ Global security check
        from apps.identity.services.security_service import is_ip_blocked
        if is_ip_blocked(ip):
            return error_response("Access Revoked. IP Blacklisted.", code=403)

        try:
            user = User.objects.get(id=user_id, role__in=[User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN, User.Roles.ADMIN, User.Roles.TEACHER])
        except User.DoesNotExist:
            return error_response("Invalid user", code=400)

        # ⏳ Cooldown implementation (5 minutes)
        from django.core.cache import cache
        cooldown_key = f"otp_resend_cooldown_{user.id}"
        remaining = cache.ttl(cooldown_key)
        
        if remaining > 0:
            return error_response(
                f"Please wait before requesting a new OTP.",
                code=429,
                data={"cooldown": remaining}
            )

        # Send new OTP (standard secure_otp function handles rotation/invalidation usually)
        send_otp_secure(user)
        cache.set(cooldown_key, True, 300) # 5 minutes
        
        logger.info(f"[ADMIN-OTP] Resent OTP for user={user.id} ip={ip}")
        return success_response("Security token resent to your verified email.")

# users/views/admin_auth_views.py
import logging
import secrets
from datetime import datetime, timezone as dt_timezone, timedelta
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
    MAX_FAILED_ATTEMPTS,
)
from apps.identity.utils.otp_utils import send_otp_secure, verify_otp_for_user
from apps.identity.utils.device_utils import get_device_hash
from apps.identity.utils.cookie_utils import (
    set_logged_in_cookie,
)
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, burn_jit_admin_ticket
from apps.identity.utils.security import hash_token

logger = logging.getLogger(__name__)

# ── Device Trust Cookie Helpers ─────────────────────────────────────────────
# An HttpOnly cookie 'auip_dt' is set after the admin passes OTP.
# Trust requires BOTH a DB RememberedDevice record AND this browser cookie.
# Guest Chrome / Incognito → empty cookie jar → always triggers OTP.

DEVICE_TRUST_COOKIE   = "auip_dt"          # HttpOnly, not JS-readable
DEVICE_TRUST_COOKIE_AGE = 60 * 60 * 24 * 30  # 30 days — matches UI label "Remember this device for 30 days"


def _get_trust_token_from_cookie(request) -> str | None:
    """Read the raw trust token sent by the browser (HttpOnly cookie)."""
    return request.COOKIES.get(DEVICE_TRUST_COOKIE)


def _set_trust_cookie(response, trust_token: str) -> None:
    """Write the trust token as an HttpOnly cookie."""
    response.set_cookie(
        DEVICE_TRUST_COOKIE,
        trust_token,
        max_age=DEVICE_TRUST_COOKIE_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax" if settings.DEBUG else "None",
        path="/",
    )


def _is_device_trusted(request, user, device_hash: str) -> bool:
    """
    Two-factor device trust:
      1. DB: RememberedDevice row must exist with trusted=True AND not expired
      2. Browser: 'auip_dt' cookie must be present and match the DB token
    Both must pass. Guest Chrome / Incognito fails on step 2.
    After 30 days: cookie expires in browser AND DB trusted_until passes → OTP required again.
    """
    cookie_token = _get_trust_token_from_cookie(request)
    if not cookie_token:
        return False   # No cookie → Guest/Incognito → trigger OTP

    hashed_cookie = hash_token(cookie_token)
    from django.utils import timezone
    return RememberedDevice.objects.filter(
        user=user,
        device_hash=device_hash,
        trusted=True,
        trust_cookie_hash=hashed_cookie,
        trusted_until__gt=timezone.now(),   # DB expiry must not be passed
    ).exists()


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
                    "Access Revoked. Your IP has been locked for 10 minutes due to repeated failures.",
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
        trusted = _is_device_trusted(request, user, device_hash)

        # ---------- Require OTP if not trusted ----------
        if not trusted:
            send_otp_secure(user)
            logger.info(f"[ADMIN-LOGIN] OTP sent user={user.id} ip={ip}")
            return success_response(
                "OTP required",
                data={"require_otp": True, "user_id": user.id},
            )

        # ✅ INSTITUTION VALIDATION (For Institutional Admins)
        # If logging into a specific institution, verify the link.
        institution_id = request.data.get("institution_id")
        if user.role == User.Roles.INSTITUTION_ADMIN:
            if not institution_id:
                 # In a unified portal, we should ideally require this, 
                 # but we might want to allow global lookup if permitted.
                 # For now, if provided, we STICK to it.
                 pass
            else:
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
                logger.debug(f"[ADMIN-LOGIN] Injecting institutional claims for schema={inst.schema_name}")

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
            # Propagate specific auth errors (like cooldown) to the user
            return error_response(str(ae), code=401)
        except Exception as e:
            register_failed_attempt(login_field, ip)
            logger.warning(f"[ADMIN-LOGIN] denied login_field={login_field} ip={ip}: {str(e)}")
            return error_response("Invalid credentials", code=401)

        # BURN JIT TICKET ON SUCCESS
        if user.role == User.Roles.SUPER_ADMIN:
            jit_ticket = request.data.get("jit_ticket")
            institution_id = request.data.get("institution_id")
            # Only burn if it was a global login (no institution context)
            if not institution_id and jit_ticket:
                burn_jit_admin_ticket(jit_ticket)
                logger.info(f"[SEC-GATE] SuperAdmin JIT ticket burned user={user.id}")

        # token_data contains {"refresh","access",...}; set cookie + normalize payload
        access = token_data.get("access")
        refresh = token_data.get("refresh")

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
            attempts_left = register_global_failure(ip, user_agent, f"USER_ID:{user_id}")
            logger.warning(f"[ADMIN-OTP] invalid OTP user={user.id} ip={ip} attempts_left={attempts_left}")
            
            # 🔥 Requirement: Burn JIT if IP is locked out
            if attempts_left <= 0:
                jit_ticket = request.data.get("jit_ticket")
                if jit_ticket:
                    burn_jit_admin_ticket(jit_ticket)
                    logger.error(f"[SEC-GATE] Sustained attack detected during MFA. JIT ticket RECALLED for IP={ip}")

            msg = "Invalid or expired OTP."
            if attempts_left <= 2:
                msg = f"Invalid OTP. Warning: {attempts_left} attempt{'s' if attempts_left != 1 else ''} remaining before total IP lockout."
            return error_response(msg, code=401, data={"attempts_remaining": attempts_left})


        # ✅ OTP PASSED → clear all failure counters for this IP
        # Professional requirement: successful auth resets all penalty state
        from apps.identity.services.security_service import clear_global_failures
        clear_global_failures(ip)
        # Also clear the per-identifier brute force counter
        clear_failed_attempt(f"USER_ID:{user_id}", ip)
        logger.info(f"[ADMIN-OTP] Failure counters cleared for user={user.id} ip={ip}")

        # ✅ JIT TICKET ENFORCEMENT FOR SUPER ADMIN (OTP Stage)
        # We do NOT re-verify the raw JIT ticket here to avoid false failures.
        # Instead, we verify the short-lived OTP session key set during password stage.
        if user.role == User.Roles.SUPER_ADMIN:
            institution_id = request.data.get("institution_id")
            if institution_id:
                logger.info(f"[SEC-GATE] SuperAdmin Scoped OTP for Inst={institution_id}. JIT Bypassed.")
            else:
                from django.core.cache import cache as dj_cache
                otp_session_key = f"jit_otp_session:{user.id}"
                stored_ticket = dj_cache.get(otp_session_key)
                if not stored_ticket:
                    logger.warning(f"[SEC-GATE] OTP stage: JIT OTP session missing/expired for user={user.id}")
                    return error_response(
                        "Security session expired. Please request a new access link and try again.",
                        code=403
                    )
                # Read the original jit_ticket from session for burning later
                jit_ticket = stored_ticket
                logger.info(f"[SEC-GATE] OTP session validated for user={user.id}")

        # ---------- Mark device trusted (DB + set browser cookie) ----------
        should_trust = request.data.get("remember_device", False)

        # Only generate a new trust token when the user is GRANTING trust
        # (i.e. checking "remember this device"). If should_trust=False, we
        # intentionally preserve whatever trust_cookie_hash is already in the DB
        # so that OTHER browsers that previously chose to trust this device-hash
        # are not accidentally invalidated.
        trust_token = None
        if should_trust:
            trust_token = secrets.token_hex(32)   # fresh browser-side secret
            hashed_trust = hash_token(trust_token) # what goes in the DB
            from django.utils import timezone as dj_timezone
            trust_expiry = dj_timezone.now() + timedelta(seconds=DEVICE_TRUST_COOKIE_AGE)  # 30 days, matches cookie

        # Shared non-trust fields (always updated)
        common_fields = {
            "last_active": datetime.now(tz=dt_timezone.utc),
            "ip_address": ip,
            "user_agent": user_agent,
        }

        existing = RememberedDevice.objects.filter(user=user, device_hash=device_hash).first()
        if existing:
            # Always update activity metadata
            for k, v in common_fields.items():
                setattr(existing, k, v)
            update_fields = list(common_fields.keys())

            # Only flip trusted / hash when user explicitly chose to trust
            if should_trust:
                existing.trusted = True
                existing.trust_cookie_hash = hashed_trust
                existing.trusted_until = trust_expiry  # DB expiry = cookie expiry (30 days)
                update_fields += ["trusted", "trust_cookie_hash", "trusted_until"]

            existing.save(update_fields=update_fields)
            logger.debug(f"[ADMIN-OTP] Updated RememberedDevice for user={user.id} trust_changed={should_trust}")
        else:
            # First time for this device-hash: create record
            RememberedDevice.objects.create(
                user=user,
                device_hash=device_hash,
                trusted=bool(should_trust),
                trust_cookie_hash=hashed_trust if should_trust else "",
                trusted_until=trust_expiry if should_trust else None,  # None = never trusted
                **common_fields,
            )
            logger.debug(f"[ADMIN-OTP] Created RememberedDevice for user={user.id} trusted={should_trust}")


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
        set_logged_in_cookie(resp, "true", role=user.role)

        # ✅ Set browser-side device trust cookie (HttpOnly, JS-invisible)
        # Only set if user ticked "remember this device"
        if should_trust:
            _set_trust_cookie(resp, trust_token)
            logger.info(f"[ADMIN-OTP] Device trust cookie set for user={user.id}")

        # BURN JIT TICKET ON SUCCESS & Reset Cooldown & clean OTP session
        if user.role == User.Roles.SUPER_ADMIN:
            institution_id = request.data.get("institution_id")
            if not institution_id and jit_ticket:
                from apps.identity.utils.jit_admin import burn_jit_admin_ticket
                burn_jit_admin_ticket(jit_ticket)
                from django.core.cache import cache as dj_cache
                dj_cache.delete(f"jit_burst_{user.email.lower().strip()}")
                dj_cache.delete(f"jit_otp_session:{user.id}")  # clean up session proof
                logger.info(f"[SEC-GATE] SuperAdmin JIT burned & session cleaned user={user.id}")

        logger.info(f"[ADMIN-OTP] OK user={user.id} ip={ip} trusted={should_trust}")
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

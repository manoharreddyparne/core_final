# users/services/token_service.py
import logging
from datetime import datetime, timezone as dt_timezone
from typing import Optional

from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from apps.identity.models import LoginSession, User
from apps.identity.utils.device_utils import get_device_hash, is_local_dev
from apps.identity.utils.ws_utils import send_session_ws_event

logger = logging.getLogger(__name__)

# Optional imports for token blacklist
try:
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
    TOKEN_BLACKLIST_AVAILABLE = True
except ImportError:
    OutstandingToken = None
    BlacklistedToken = None
    TOKEN_BLACKLIST_AVAILABLE = False

DEFAULT_IP = "0.0.0.0"


# -------------------------------
# Blacklist Helpers
# -------------------------------
def blacklist_refresh_jti(refresh_jti: str, user: Optional[User] = None) -> bool:
    """
    Blacklist a refresh token by JTI (noop if blacklist app not installed).
    """
    if not TOKEN_BLACKLIST_AVAILABLE or not refresh_jti:
        return True
    try:
        qs = OutstandingToken.objects.filter(jti=refresh_jti)
        if user:
            qs = qs.filter(user=user)
        token = qs.first()
        if token:
            BlacklistedToken.objects.get_or_create(token=token)
            import traceback
            tb = "".join(traceback.format_stack())
            logger.info(f"[TOKEN] Blacklisted refresh JTI={refresh_jti} user_id={getattr(user,'id', None)}\nTraceback:\n{tb}")
        return True
    except Exception as e:
        logger.warning(f"[TOKEN] Blacklist failed JTI={refresh_jti}: {e}")
        return False


# -------------------------------
# Fingerprint Verification
# -------------------------------
def _expected_fingerprint(session: LoginSession, ip: str, user_agent: str) -> str:
    """
    Build the expected fingerprint. 
    Industry-level approach: Bind to UA + IP + Salt for maximum perimeter security.
    """
    # Use both IP and UA for strict binding as requested by user
    return get_device_hash(ip or "unknown", user_agent or "unknown", salt=session.device_salt)


def verify_session_fingerprint(session: LoginSession, ip: str, user_agent: str):
    """
    Ensure the device fingerprint matches the session.
    Local dev IPs are allowed to bypass strict checks.
    """
    # Bypass on local/dev IPs to reduce friction during development.
    if is_local_dev(ip):
        return True

    expected = _expected_fingerprint(session, ip, user_agent)
    if session.device_fingerprint != expected:
        # Hard security response: kill session + blacklist refresh + notify
        blacklist_refresh_jti(session.refresh_jti, user=session.user)
        session.is_active = False
        session.save(update_fields=["is_active"])
        send_session_ws_event(session.user.id, "force_logout", session.id)
        raise AuthenticationFailed("Invalid device for this token.")
    return True


# -------------------------------
# Session Management
# -------------------------------
@transaction.atomic
def create_login_session_safe(
    user: User,
    access_token: str,
    refresh_token: Optional[str] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    device: str = "web",
    role: str = None,
) -> LoginSession:
    from django.conf import settings

    # Normalize IP and user agent for safe DB insert
    if not ip or str(ip).lower() in ("unknown", "null", "none"):
        ip = "127.0.0.1" if getattr(settings, "DEBUG", False) else DEFAULT_IP
    user_agent = user_agent or "unknown"

    try:
        # Parse access token core claims
        untoken = UntypedToken(access_token)
        jti = untoken.get("jti")
        exp = datetime.fromtimestamp(int(untoken.get("exp")), tz=dt_timezone.utc)

        # Extract refresh JTI + (optionally) expiry
        refresh_jti = None
        refresh_exp_dt: Optional[datetime] = None
        if refresh_token:
            try:
                # Prefer RefreshToken to ensure correct type
                r = RefreshToken(refresh_token)
                refresh_jti = r.get("jti")
                if r.get("exp"):
                    refresh_exp_dt = datetime.fromtimestamp(int(r.get("exp")), tz=dt_timezone.utc)
            except Exception:
                try:
                    # Fallback to UntypedToken if needed
                    r2 = UntypedToken(refresh_token)
                    refresh_jti = r2.get("jti")
                    if r2.get("exp"):
                        refresh_exp_dt = datetime.fromtimestamp(int(r2.get("exp")), tz=dt_timezone.utc)
                except Exception:
                    pass

        # Build UA+IP+salt fingerprint for strict machine binding
        salt = LoginSession.make_device_salt()
        fingerprint = get_device_hash(ip, user_agent, salt=salt)

        # Metadata for isolated tenant sessions
        tenant_user_id = untoken.get("tenant_user_id")
        tenant_schema = untoken.get("schema") or ""
        tenant_email = untoken.get("email") or ""

        # 🧹 Deactivate existing active sessions
        if refresh_jti:
            if isinstance(user, User):
                active = LoginSession.objects.filter(user=user, refresh_jti=refresh_jti, is_active=True)
            else:
                active = LoginSession.objects.filter(
                    tenant_email=tenant_email, 
                    tenant_schema=tenant_schema, 
                    refresh_jti=refresh_jti, 
                    is_active=True
                )
            for s in active:
                s.is_active = False
                s.save(update_fields=["is_active"])
                blacklist_refresh_jti(refresh_jti, user=s.user)
                ws_id = user.id if user and hasattr(user, 'id') else tenant_email
                send_session_ws_event(ws_id, "rotated", s.id, role=role)

        email = user.email if hasattr(user, 'email') else tenant_email
        logger.debug(
            f"[SESSION] Creating session user={email} ip={ip} device={device}"
        )

        # Avoid storing plaintext refresh token; keep only JTI and (optionally) expiry.
        # ✅ FIX: Use Refresh Token expiry if available, otherwise fallback to Access Token expiry.
        # This prevents sessions from dying in 5 mins (Access Token lifetime) instead of 7 days.
        final_expiry = refresh_exp_dt if refresh_exp_dt else exp

        # Ensure we only pass real User to FK
        real_user = user if isinstance(user, User) else None

        create_kwargs = dict(
            user=real_user,
            jti=jti,
            token_str=access_token,
            refresh_jti=refresh_jti,
            refresh_token_str=None,
            device_fingerprint=fingerprint,
            device=device,
            ip_address=ip,
            user_agent=user_agent,
            expires_at=final_expiry,
            device_salt=salt,
            tenant_user_id=tenant_user_id,
            tenant_schema=tenant_schema,
            tenant_email=tenant_email,
            role=role or untoken.get("role"),
        )

        session = LoginSession.create_session(**create_kwargs)

        ws_id = user.id if user and hasattr(user, 'id') else tenant_email
        send_session_ws_event(ws_id, "new_session", session.id, role=role)
        return session

    except Exception as e:
        logger.error(
            f"[SESSION] Creation failed user_id={getattr(user,'id',None)}: {e}",
            exc_info=True,
        )
        raise AuthenticationFailed("Invalid or expired token")


# -------------------------------
# Token Rotation
# -------------------------------
@transaction.atomic
def rotate_tokens_secure(
    user: User,
    old_refresh: str,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict:
    old = RefreshToken(old_refresh)
    session = LoginSession.objects.filter(user=user, refresh_jti=old.get("jti"), is_active=True).first()
    if not session:
        raise AuthenticationFailed("Session not found or expired.")

    verify_session_fingerprint(session, ip or DEFAULT_IP, user_agent or "unknown")

    # Mint new pair
    new_refresh = RefreshToken.for_user(user)
    new_access = new_refresh.access_token

    # Build Quantum Shield fragments from new refresh token
    from apps.identity.services.quantum_shield import QuantumShieldService
    refresh_str = str(new_refresh)
    parts = refresh_str.split('.')
    header_payload = f"{parts[0]}.{parts[1]}"
    signature = parts[2]
    mid = len(header_payload) // 2

    # ✅ Update session with new refresh JTI
    from django.utils import timezone
    session.is_active = True
    session.refresh_jti = new_refresh.get("jti")  # Update to new refresh JTI
    session.expires_at = timezone.now() + timezone.timedelta(days=7)
    session.save(update_fields=["is_active", "refresh_jti", "expires_at"])
    
    blacklist_refresh_jti(old.get("jti"), user=user)
    send_session_ws_event(user.id, "rotated", session_id=session.id, jti=session.jti)

    fragments = {
        QuantumShieldService.SEGMENT_T: header_payload[:mid],
        QuantumShieldService.SEGMENT_ID: str(session.id),
        QuantumShieldService.SEGMENT_P: header_payload[mid:],
        QuantumShieldService.SEGMENT_S: signature
    }

    return {
        "access": str(new_access),
        "refresh": refresh_str,
        "fragments": fragments
    }


# -------------------------------
# Logout Helpers
# -------------------------------
@transaction.atomic
def logout_single_session_secure(user, session_id=None, access_jti=None, refresh_token=None, schema=None) -> bool:
    """Invalidate a single session by ID or Token JTI."""
    from django.db.models import Q
    from apps.identity.models.core_models import User
    
    session_ids = set()
    if session_id:
        session_ids.add(session_id)

    # Multi-tenant filtering logic
    if hasattr(user, 'role') and user.role in ('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'):
        effective_schema = schema or getattr(getattr(user, 'institution', None), 'schema_name', '')
        user_filter = Q(tenant_user_id=user.id, tenant_schema=effective_schema)
    else:
        # Global User
        user_filter = Q(user=user)
        # If schema is provided, isolate to that schema only to prevent manager interference
        if schema:
            user_filter &= Q(tenant_schema=schema)

    if refresh_token:
        rt = RefreshToken(refresh_token)
        for s in LoginSession.objects.filter(user_filter, refresh_jti=rt.get("jti"), is_active=True):
            session_ids.add(s.id)
    if access_jti:
        for s in LoginSession.objects.filter(user_filter, jti=access_jti, is_active=True):
            session_ids.add(s.id)

    ws_id = user.id

    for s in LoginSession.objects.filter(id__in=session_ids):
        s.is_active = False
        s.save(update_fields=["is_active"])
        user_obj = s.user if hasattr(s, 'user') else None
        blacklist_refresh_jti(s.refresh_jti, user=user_obj)
        # ✅ SURGICAL TARGETING: Use the role stored IN THE SESSION
        send_session_ws_event(ws_id, "force_logout", s.id, s.jti, role=s.role)
    
    return True

@transaction.atomic
def logout_all_sessions_secure(user, exclude_session_id=None, exclude_jti=None, schema=None) -> int:
    """Invalidate all active sessions for a user, with optional exclusions."""
    from django.db.models import Q
    from apps.identity.models.core_models import User

    # Determine filter based on Identity type
    if hasattr(user, 'role') and user.role in ('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'):
        effective_schema = schema or getattr(getattr(user, 'institution', None), 'schema_name', '')
        user_filter = Q(tenant_user_id=user.id, tenant_schema=effective_schema)
    else:
        # Global User
        user_filter = Q(user=user)
        # 🛡️ ISOLATION: If we have a schema context, restrict logout to that context only.
        # This prevents an admin logging out of an institution from killing their super-admin portal session.
        if schema:
            user_filter &= Q(tenant_schema=schema)

    qs = LoginSession.objects.filter(user_filter, is_active=True)
    if exclude_session_id:
        qs = qs.exclude(id=exclude_session_id)
    if exclude_jti:
        qs = qs.exclude(jti=exclude_jti)
        
    count_before = qs.count()
    ws_id = user.id

    for s in qs:
        try:
            s.is_active = False
            s.save(update_fields=["is_active"])
            user_obj = s.user if hasattr(s, 'user') else None
            blacklist_refresh_jti(s.refresh_jti, user=user_obj)
            # ✅ SURGICAL TARGETING: Use the role recorded for this specific session
            role_to_notify = s.role or getattr(user, 'role', 'anonymous')
            send_session_ws_event(ws_id, "force_logout", s.id, s.jti, role=role_to_notify)
        except Exception as e:
            logger.warning(f"[SESSION] Failed logout session_id={s.id} user_id={user.id}: {e}")
    
    return count_before


# -------------------------------
# Access Token Validation
# -------------------------------
def authenticate_access_token(token_str: str, ip: str = DEFAULT_IP, user_agent: str = "unknown") -> User:
    try:
        untoken = UntypedToken(token_str)
        jti = untoken.get("jti")
        user_id = untoken.get("user_id")
        if not user_id:
            raise AuthenticationFailed("Token missing user info.")
        user = User.objects.get(id=user_id)

        session = user.login_sessions.filter(jti=jti, is_active=True).first()
        if not session:
            raise AuthenticationFailed("Session not found or expired.")

        verify_session_fingerprint(session, ip, user_agent)
        return user
    except Exception:
        # Do not leak specifics to the client
        raise AuthenticationFailed("Invalid or expired access token")

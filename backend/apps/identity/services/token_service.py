# users/services/token_service.py
import logging
from datetime import datetime, timezone as dt_timezone
from typing import Optional

from django.db import transaction
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken

from users.models import LoginSession, User
from users.utils.device_utils import get_device_hash, is_local_dev
from users.utils.ws_utils import send_session_ws_event

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
    Build the expected fingerprint. We bind to UA+salt and *ignore IP*
    for real-world UX stability. Local-dev bypass remains elsewhere.
    """
    # Ignore IP for fingerprinting; use a static marker for consistency.
    return get_device_hash("static", user_agent or "unknown", salt=session.device_salt)


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

        # Build UA+salt fingerprint (IP intentionally ignored for UX stability)
        salt = LoginSession.make_device_salt()
        fingerprint = get_device_hash("static", user_agent, salt=salt)

        # 🧹 Deactivate existing active sessions with the same refresh JTI
        # Mark as rotated instead of scary force logout, since this is a normal lifecycle event.
        if refresh_jti:
            active = LoginSession.objects.filter(user=user, refresh_jti=refresh_jti, is_active=True)
            for s in active:
                s.is_active = False
                s.save(update_fields=["is_active"])
                blacklist_refresh_jti(refresh_jti, user=user)
                send_session_ws_event(user.id, "rotated", s.id)

        logger.debug(
            f"[SESSION] Creating session user={user.email} ip={ip} device={device} agent={user_agent[:80]}"
        )

        # Avoid storing plaintext refresh token; keep only JTI and (optionally) expiry.
        create_kwargs = dict(
            user=user,
            jti=jti,
            token_str=access_token,
            refresh_jti=refresh_jti,
            refresh_token_str=None,  # 🔒 do not persist raw refresh token
            device_fingerprint=fingerprint,
            device=device,
            ip_address=ip,
            user_agent=user_agent,
            expires_at=exp,
            device_salt=salt,
        )

        # Backward-compatible optional arg for refresh expiry
        if refresh_exp_dt is not None:
            try:
                session = LoginSession.create_session(**create_kwargs, refresh_expires_at=refresh_exp_dt)
            except TypeError:
                # Model/create_session may not support refresh_expires_at yet
                session = LoginSession.create_session(**create_kwargs)
        else:
            session = LoginSession.create_session(**create_kwargs)

        send_session_ws_event(user.id, "new_session", session.id)
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

    # Create a fresh session tied to the new pair
    create_login_session_safe(user, str(new_access), str(new_refresh), ip, user_agent)

    # Deactivate previous session and blacklist its refresh
    session.is_active = False
    session.save(update_fields=["is_active"])
    blacklist_refresh_jti(old.get("jti"), user=user)

    # Send a gentle "rotated" event (not a force logout) for better UX
    send_session_ws_event(user.id, "rotated", session.id)

    return {"refresh": str(new_refresh), "access": str(new_access)}


# -------------------------------
# Logout Helpers
# -------------------------------
@transaction.atomic
def logout_single_session_secure(user: User, refresh_token: Optional[str] = None, access_jti: Optional[str] = None):
    session_ids = set()
    if refresh_token:
        rt = RefreshToken(refresh_token)
        for s in LoginSession.objects.filter(user=user, refresh_jti=rt.get("jti"), is_active=True):
            session_ids.add(s.id)
    if access_jti:
        for s in LoginSession.objects.filter(user=user, jti=access_jti, is_active=True):
            session_ids.add(s.id)

    for s in LoginSession.objects.filter(id__in=session_ids):
        s.is_active = False
        s.save(update_fields=["is_active"])
        blacklist_refresh_jti(s.refresh_jti, user=s.user)
        send_session_ws_event(user.id, "force_logout", s.id)

@transaction.atomic
def logout_all_sessions_secure(user: User, exclude_session_id: Optional[int] = None) -> int:
    qs = LoginSession.objects.filter(user=user, is_active=True)
    if exclude_session_id:
        qs = qs.exclude(id=exclude_session_id)
        
    count_before = qs.count()
    for s in qs:
        try:
            s.is_active = False
            s.save(update_fields=["is_active"])
            blacklist_refresh_jti(s.refresh_jti, user=s.user)
            send_session_ws_event(user.id, "force_logout", s.id)
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

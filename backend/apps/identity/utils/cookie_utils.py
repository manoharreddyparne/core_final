# users/utils/cookie_utils.py
from django.conf import settings
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)

# ------------------------------------------------------------
# COOKIE CONFIG
# ------------------------------------------------------------

REFRESH_COOKIE_NAME = getattr(settings, "REFRESH_COOKIE_NAME", "refresh_token")
REFRESH_COOKIE_PATH = getattr(settings, "REFRESH_COOKIE_PATH", "/")
REFRESH_COOKIE_HTTPONLY = getattr(settings, "REFRESH_COOKIE_HTTPONLY", True)
REFRESH_COOKIE_SECURE = getattr(settings, "REFRESH_COOKIE_SECURE", not settings.DEBUG)
REFRESH_COOKIE_SAMESITE = getattr(settings, "REFRESH_COOKIE_SAMESITE", "Lax")
REFRESH_COOKIE_MAX_AGE = getattr(settings, "REFRESH_COOKIE_MAX_AGE", 60 * 60 * 24 * 30)


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def set_refresh_cookie(
    response: Response,
    token: str,
    *,
    max_age: int = REFRESH_COOKIE_MAX_AGE,
):
    """
    Sets the HttpOnly refresh cookie.
    Only the browser & server use this; JS cannot access it.

    ✅ Correct flags:
        - HttpOnly
        - Secure (prod)
        - SameSite=Lax
        - Wide path
    """
    logger.info(
        f"[COOKIE] Setting {REFRESH_COOKIE_NAME}: SameSite={REFRESH_COOKIE_SAMESITE}, Secure={REFRESH_COOKIE_SECURE}"
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=max_age,
        path=REFRESH_COOKIE_PATH,
        secure=REFRESH_COOKIE_SECURE,
        httponly=REFRESH_COOKIE_HTTPONLY,
        samesite=REFRESH_COOKIE_SAMESITE,
    )
    
    # ✅ UX Marker: Non-HttpOnly cookie to let frontend know session exists
    response.set_cookie(
        key="refresh_token_present",
        value="1",
        max_age=max_age,
        path=REFRESH_COOKIE_PATH,
        secure=REFRESH_COOKIE_SECURE,
        httponly=False,  # Accessible to JS
        samesite=REFRESH_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response: Response):
    """Remove refresh cookie cleanly."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


def clear_session_cookies(response: Response):
    """Clear all session cookies."""
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    response.delete_cookie("refresh_token_present", path=REFRESH_COOKIE_PATH)


# ------------------------------------------------------------
# INVALIDATION HELPER
# ------------------------------------------------------------

def invalidate_session(session, reason="Device mismatch"):
    """
    1) Marks session inactive
    2) Blacklists refresh JTI
    3) Raises logout event
    4) Clears cookies
    """
    # NOTE: use public helpers; avoid internal/private patterns
    from apps.identity.services.token_service import (
        blacklist_refresh_jti,
        send_session_ws_event,
    )

    try:
        blacklist_refresh_jti(session.refresh_jti, user=session.user)
    except Exception:
        pass

    session.is_active = False
    session.save(update_fields=["is_active"])

    # Force the frontend to recognize logout
    send_session_ws_event(session.user.id, "force_logout", session.id)

    resp = Response(
        {"detail": f"{reason} — session invalidated"},
        status=401,
    )

    clear_session_cookies(resp)
    return resp

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
    ❌ DEPRECATED: Use set_quantum_shield instead.
    This helper is kept only for backward compatibility during migration.
    """
    logger.warning("[COOKIE] ⚠️ Legacy set_refresh_cookie called! Please migrate to set_quantum_shield.")
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


def clear_refresh_cookie(response: Response):
    """
    Remove refresh cookie cleanly.
    ❌ DEPRECATED: Use clear_quantum_shield instead.
    """
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


LOGGED_IN_COOKIE_NAME = "auip_logged_in"


def set_logged_in_cookie(response: Response, value: str = "true", max_age: int = REFRESH_COOKIE_MAX_AGE):
    """
    Sets a client-readable marker cookie (not HttpOnly).
    Frontend can check this to know if a session *should* exist.
    """
    response.set_cookie(
        key=LOGGED_IN_COOKIE_NAME,
        value=value,
        max_age=max_age,
        path=REFRESH_COOKIE_PATH,
        secure=REFRESH_COOKIE_SECURE,
        httponly=False,  # ✅ JS accessible
        samesite=REFRESH_COOKIE_SAMESITE,
    )


def clear_logged_in_cookie(response: Response):
    """Remove logged-in marker."""
    response.delete_cookie(
        key=LOGGED_IN_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
    )


def clear_session_cookies(response: Response):
    """Clear the HttpOnly refresh cookie AND the logged-in marker."""
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)
    clear_logged_in_cookie(response)
    clear_quantum_shield(response) # ✅ Sweep all segments

# Alias for legacy compatibility
invalidate_session = clear_session_cookies


# ------------------------------------------------------------
# QUANTUM SHIELD HELPERS
# ------------------------------------------------------------

def set_quantum_shield(response: Response, fragments: dict, max_age: int = REFRESH_COOKIE_MAX_AGE):
    """
    Sets the 4-segment Quantum Shield cookies.
    """
    from apps.identity.services.quantum_shield import QuantumShieldService
    
    for key, value in fragments.items():
        is_public = (key == QuantumShieldService.SEGMENT_T)
        
        response.set_cookie(
            key=key,
            value=value,
            max_age=max_age,
            path=REFRESH_COOKIE_PATH,
            secure=REFRESH_COOKIE_SECURE,
            httponly=not is_public,  # ✅ JS can only read Segment T (TTL)
            samesite="Strict" if not is_public else "Lax",
        )

def clear_quantum_shield(response: Response):
    """Wipe all 4 shield segments."""
    from apps.identity.services.quantum_shield import QuantumShieldService
    
    segments = [
        QuantumShieldService.SEGMENT_T,
        QuantumShieldService.SEGMENT_ID,
        QuantumShieldService.SEGMENT_P,
        QuantumShieldService.SEGMENT_S
    ]
    for seg in segments:
        response.delete_cookie(seg, path=REFRESH_COOKIE_PATH)

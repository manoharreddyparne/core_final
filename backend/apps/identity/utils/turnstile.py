import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def verify_turnstile_token(token: str) -> bool:
    """Verify Cloudflare Turnstile token for human verification."""
    if not settings.TURNSTILE_ENABLED:
        return True
    
    if not token:
        logger.warning("Turnstile validation failed: No token provided")
        return False
    
    # Support for Cloudflare Testing Keys in Development
    # Sitekey: 1x00000000000000000000AA (Always Pass)
    # Secret:  1x000000000000000000000000000000AA
    secret_key = settings.TURNSTILE_SECRET_KEY
        
    try:
        # ⚡ Optimization: Short-circuit testing keys in DEBUG mode (no network call)
        if settings.DEBUG and token.startswith("1x00000000"):
            logger.info(f"[TURNSTILE] Development dummy token detected. Short-circuiting verification.")
            return True

        active_secret = secret_key
        # If token is the global testing token, use the global testing secret
        if token.startswith("1x00000000"):
            active_secret = "1x000000000000000000000000000000AA"

        response = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": active_secret,
                "response": token,
            },
            timeout=5
        )
        data = response.json()
        success = data.get("success", False)
        if not success:
            error_codes = data.get('error-codes', [])
            logger.warning(f"[TURNSTILE] Validation failed for token {token[:10]}... Error Codes: {error_codes}")
        else:
            logger.info(f"[TURNSTILE] Validation SUCCESS for token {token[:10]}...")
        return success
    except Exception as e:
        logger.error(f"[TURNSTILE] Critical verification error: {e}")
        return False

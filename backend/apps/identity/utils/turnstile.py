import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def verify_turnstile_token(token: str) -> bool:
    """
    Verify Cloudflare Turnstile token against their API.
    Returns True if valid or if Turnstile is disabled.
    """
    if not settings.TURNSTILE_ENABLED:
        return True
    
    if not token:
        return False
    
    try:
        response = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={
                "secret": settings.TURNSTILE_SECRET_KEY,
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

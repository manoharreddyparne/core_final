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
            logger.warning(f"[TURNSTILE] Validation failed: {data.get('error-codes')}")
        return success
    except Exception as e:
        logger.error(f"[TURNSTILE] System error: {e}")
        return False

# users/utils/otp_utils.py
import logging
import secrets
from django.conf import settings
from apps.identity.utils.cache_utils import make_cache_key, cache_set, cache_get, cache_delete
from apps.identity.utils.security import hash_token_secure
from apps.identity.utils.email_utils import send_otp_to_user
from apps.identity.constants import OTP_TTL_SECONDS

logger = logging.getLogger(__name__)

def generate_otp(length: int = 6) -> str:
    """Generates a numeric OTP, padded with leading zeros."""
    return str(secrets.randbelow(10 ** length)).zfill(length)

def send_otp_secure(user, otp: str = None) -> str:
    """
    Generates and sends OTP to user. Returns OTP for dev/debug.
    """
    otp = otp or generate_otp()
    key = make_cache_key("otp", str(user.id), ip="0.0.0.0")  # No IP needed for OTP caching
    cache_set(key, hash_token_secure(otp), timeout=OTP_TTL_SECONDS)

    if not send_otp_to_user(user, otp):
        raise Exception(f"Failed to send OTP to {user.email}")

    if getattr(settings, "DEBUG", False):
        logger.info(f"[DEV OTP] User {user.id} OTP={otp}")

    return otp

def verify_otp_for_user(user, otp: str) -> bool:
    """
    Verifies OTP for a user. Deletes cache on success.
    """
    key = make_cache_key("otp", str(user.id), ip="0.0.0.0")
    hashed = cache_get(key)
    if hashed and hash_token_secure(otp) == hashed:
        cache_delete(key)
        logger.info(f"OTP verified for user {user.id}")
        return True

    logger.warning(f"OTP invalid/expired for user {user.id}")
    return False

# users/utils/otp_utils.py
import logging
import secrets
from django.conf import settings
from apps.identity.utils.cache_utils import make_cache_key, cache_set, cache_get, cache_delete
from apps.identity.utils.security import hash_token_secure
from apps.identity.utils.email_utils import send_otp_to_user # You might need send_otp_to_email as well
# Assuming send_otp_to_user takes a user object with .email attribute
# If we don't have user, we need a raw email sender.

from django.core.mail import send_mail # Fallback if email_utils doesn't support raw email

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
    # Compare hash
    # Note: cache stores hash(otp).
    # We should return True if matches.
    # Wait, original code:
    # if hashed and hash_token_secure(otp) == hashed:
    # This implies verify compares HASH of input vs STORED HASH. Correct.
    
    if hashed and hashed == hash_token_secure(otp):
        cache_delete(key)
        logger.info(f"OTP verified for user {user.id}")
        return True

    logger.warning(f"OTP invalid/expired for user {user.id}")
    return False

# --- NEW IDENTIFIER BASED UTILS ---

def send_otp_to_identifier(identifier: str, email: str, otp: str = None) -> str:
    """
    Sends OTP to an identifier (email/roll) using the provided email address.
    Used for activation where User object doesn't exist yet.
    """
    otp = otp or generate_otp()
    # Key by identifier (e.g., ROLL123)
    key = make_cache_key("otp", str(identifier), ip="0.0.0.0")
    cache_set(key, hash_token_secure(otp), timeout=OTP_TTL_SECONDS)

    # Send valid email
    try:
        subject = "AUIP - Your Verification Code"
        message = f"Your verification code is: {otp}"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email])
    except Exception as e:
        logger.error(f"Failed to send email to {email}: {e}")

    if getattr(settings, "DEBUG", False):
        logger.info(f"[DEV OTP] Identifier {identifier} OTP={otp}")

    return otp

def verify_otp_for_identifier(identifier: str, otp: str) -> bool:
    """
    Verifies OTP for an identifier.
    """
    key = make_cache_key("otp", str(identifier), ip="0.0.0.0")
    hashed = cache_get(key)
    
    if hashed and hashed == hash_token_secure(otp):
        cache_delete(key)
        logger.info(f"OTP verified for identifier {identifier}")
        return True
        
    logger.warning(f"OTP invalid/expired for identifier {identifier}")
    return False

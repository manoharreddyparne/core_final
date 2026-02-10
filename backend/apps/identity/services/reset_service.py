import logging
import secrets
import hmac
import hashlib
from typing import Optional
from datetime import timedelta, timezone
from django.utils import timezone as dj_timezone
from django.db import transaction
from django.conf import settings
from django.core.exceptions import ValidationError

from apps.identity.models import PasswordResetRequest, User
from apps.identity.services.password_service import change_user_password, check_password_reuse
from apps.identity.services.token_service import logout_all_sessions_secure
from apps.identity.utils.email_utils import create_reset_request as utils_create_reset_request

logger = logging.getLogger(__name__)

RESET_TOKEN_LENGTH = 48  # Secure random token length
RESET_TOKEN_EXPIRY_HOURS = getattr(settings, "RESET_TOKEN_EXPIRY_HOURS", 1)


# -------------------------------
# Secure HMAC-based hashing
# -------------------------------
def hash_token_secure(token: str, key_id: Optional[str] = None) -> str:
    """
    Hash the token using HMAC with SECRET_KEY and optional key rotation support.
    """
    keys = getattr(settings, "SECURITY_HMAC_KEYS", {"k1": settings.SECRET_KEY})
    current_key_id = key_id or getattr(settings, "SECURITY_HMAC_CURRENT", "k1")
    secret_key = keys.get(current_key_id, settings.SECRET_KEY)
    return hmac.new(secret_key.encode(), token.encode(), hashlib.sha256).hexdigest()


def constant_time_compare(val1: str, val2: str) -> bool:
    """Prevent timing attacks during token verification."""
    return hmac.compare_digest(val1.encode(), val2.encode())


# -------------------------------
# Create password reset request
# -------------------------------
def create_reset_request(user: User) -> tuple[PasswordResetRequest, str]:
    """
    Wrapper to generate a secure password reset request and raw token.
    """
    try:
        reset_request, raw_token = utils_create_reset_request(user)
        if not reset_request or not raw_token:
            raise ValueError(f"Failed to create reset request for {user.email}")
        logger.info(f"Password reset request created for {user.email}")
        return reset_request, raw_token
    except Exception as e:
        logger.error(f"[create_reset_request] Failed for user {user.email}: {e}", exc_info=True)
        raise


# -------------------------------
# Confirm password reset
# -------------------------------
@transaction.atomic
def confirm_reset_password(token: str, new_password: str) -> User:
    """
    Confirm a password reset token. Ensures constant-time validation and token expiry.
    """
    if not token or not new_password:
        raise ValidationError("Token and password are required.")

    hashed = hash_token_secure(token)

    reset_request = (
        PasswordResetRequest.objects
        .select_for_update()
        .filter(used=False)
        .filter(user__is_active=True)
        .filter(token_hash=hashed)
        .first()
    )

    if not reset_request:
        logger.warning("[confirm_reset_password] Invalid or missing reset request.")
        raise ValueError("Invalid or expired token.")

    # Constant-time token validation
    if not constant_time_compare(hash_token_secure(token), reset_request.token_hash):
        logger.warning(f"[confirm_reset_password] Token hash mismatch for user {reset_request.user_id}")
        raise ValueError("Invalid or expired token.")

    # Check token expiry
    expiry_time = reset_request.created_at + timedelta(hours=RESET_TOKEN_EXPIRY_HOURS)
    if dj_timezone.now() > expiry_time:
        logger.warning(f"[confirm_reset_password] Expired token for user {reset_request.user_id}")
        reset_request.used = True
        reset_request.save(update_fields=["used"])
        raise ValueError("This password reset link has expired.")

    user = reset_request.user

    # Prevent password reuse
    if check_password_reuse(user, new_password):
        logger.warning(f"User {user.email} attempted to reuse an old password during reset.")
        raise ValueError("Cannot reuse a previously used password.")

    # Change password securely
    change_user_password(user, new_password=new_password)

    # Invalidate all existing sessions
    logout_all_sessions_secure(user)

    # Mark token as used
    reset_request.used = True
    reset_request.save(update_fields=["used"])

    logger.info(f"Password reset confirmed for user {user.email}")

    # Optional: cleanup old requests to prevent buildup
    PasswordResetRequest.objects.filter(
        user=user, used=True, created_at__lt=dj_timezone.now() - timedelta(days=1)
    ).delete()

    return user


# -------------------------------
# Backward compatibility aliases
# -------------------------------
generate_reset_token = create_reset_request
reset_password = confirm_reset_password

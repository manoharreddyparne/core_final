# users/services/password_service.py
import logging
import re
from typing import Tuple
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from users.models import PasswordHistory, User

logger = logging.getLogger(__name__)

# =========================================================
# PASSWORD VALIDATION
# =========================================================
def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password strength and return (is_valid, message).
    Each message is toast-ready for frontend feedback.
    """
    if not password:
        return False, "Password cannot be empty."

    # Length validations
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 16:
        return False, "Password must not exceed 16 characters."

    # Whitespace and repetition
    if " " in password:
        return False, "Password cannot contain spaces."
    if re.search(r"(.)\1\1", password):
        return False, "Password cannot contain three consecutive identical characters."

    # Character class validations
    if not re.search(r"[A-Z]", password):
        return False, "Password must include at least one uppercase letter (A–Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must include at least one lowercase letter (a–z)."
    if not re.search(r"[0-9]", password):
        return False, "Password must include at least one digit (0–9)."
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]", password):
        return False, "Password must include at least one special character (e.g., !, @, #, $)."

    # Common or predictable patterns
    if re.search(r"(1234|abcd|password|qwerty|admin)", password, re.IGNORECASE):
        return False, "Password cannot contain common or predictable patterns."

    return True, ""


# =========================================================
# PASSWORD REUSE CHECK
# =========================================================
def check_password_reuse(user: User, new_password: str, history_limit: int = 5) -> bool:
    """
    Check if the new password matches any of the user's recent passwords.
    Returns True if reused, False otherwise.
    """
    try:
        recent_passwords = (
            PasswordHistory.objects.filter(user=user)
            .order_by('-created_at')[:history_limit]
        )

        reused = any(check_password(new_password, past.password_hash) for past in recent_passwords)
        if reused:
            logger.warning(f"[PasswordService] Password reuse detected for user {user.email}")

        return reused
    except Exception as e:
        logger.error(f"[PasswordService] check_password_reuse failed for {user.email}: {e}", exc_info=True)
        return False


# =========================================================
# PASSWORD HISTORY LOGGING
# =========================================================
def log_password_history(user: User, password: str) -> None:
    """
    Hash and store the user's password in the history table.
    """
    try:
        hashed = make_password(password)
        PasswordHistory.objects.create(user=user, password_hash=hashed)
        logger.debug(f"[PasswordService] Password history logged for {user.email}")
    except Exception as e:
        logger.error(f"[PasswordService] log_password_history failed for {user.email}: {e}", exc_info=True)


# =========================================================
# PASSWORD CHANGE
# =========================================================
@transaction.atomic
def change_user_password(user: User, new_password: str) -> None:
    """
    Securely change the user's password and update related fields.
    """
    try:
        user.set_password(new_password)
        user.first_time_login = False
        user.need_password_reset = False
        user.save(update_fields=["password", "first_time_login", "need_password_reset"])

        log_password_history(user, new_password)
        logger.info(f"[PasswordService] Password changed successfully for {user.email}")

    except Exception as e:
        logger.error(f"[PasswordService] change_user_password failed for {user.email}: {e}", exc_info=True)
        raise


# =========================================================
# BACKWARD COMPATIBILITY ALIASES
# =========================================================
validate_password = validate_password_strength
check_reuse = check_password_reuse
update_password = change_user_password

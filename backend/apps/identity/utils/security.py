# users/utils/security.py
"""
HMAC token hashing with support for key rotation, JWT verification, and token normalization.
"""

import hmac
import hashlib
import logging
from typing import Dict, Tuple, Optional
from urllib.parse import unquote
from django.conf import settings

logger = logging.getLogger(__name__)

# -------------------------
# CONFIG
# -------------------------
KEYS_SETTING_NAME = "SECURITY_HMAC_KEYS"
CURRENT_KEY_SETTING = "SECURITY_HMAC_CURRENT"
SEPARATOR = "$"  # between key id and HMAC value


# -------------------------
# TOKEN HASHING / VERIFICATION
# -------------------------
def _get_keys() -> Dict[str, bytes]:
    """Return mapping of key_id -> key_bytes."""
    raw = getattr(settings, KEYS_SETTING_NAME, None)
    if not raw or not isinstance(raw, dict):
        logger.error(f"{KEYS_SETTING_NAME} not configured or invalid type.")
        return {}
    return {k: v.encode("utf-8") for k, v in raw.items()}


def _get_current_key() -> Tuple[Optional[str], Optional[bytes]]:
    """Return tuple (key_id, key_bytes) for current key. None,None if missing."""
    keys = _get_keys()
    current_id = getattr(settings, CURRENT_KEY_SETTING, None)
    if not current_id:
        # fallback: last key in dict
        if keys:
            last_key = next(reversed(keys))
            return last_key, keys[last_key]
        return None, None
    key = keys.get(current_id)
    if not key:
        logger.error(f"Current key id {current_id} not found in {KEYS_SETTING_NAME}.")
        return None, None
    return current_id, key


def _hmac_hex(key: bytes, token: str) -> str:
    return hmac.new(key, token.encode("utf-8"), hashlib.sha256).hexdigest()


def hash_token(token: str) -> str:
    """Hash token using current HMAC key and return '<key_id>$<hmac_hex>'."""
    key_id, key = _get_current_key()
    if not key_id or not key:
        logger.warning("HMAC keys not configured; falling back to plain SHA256 (not recommended).")
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
    return f"{key_id}{SEPARATOR}{_hmac_hex(key, token)}"


def verify_token(token: str, stored_hash: str) -> bool:
    """Verify token against stored hash. Accepts any key in SECURITY_HMAC_KEYS."""
    if not stored_hash:
        return False
    try:
        key_id, hmac_val = stored_hash.split(SEPARATOR, 1)
    except ValueError:
        # legacy hash fallback
        return hashlib.sha256(token.encode("utf-8")).hexdigest() == stored_hash

    key = _get_keys().get(key_id)
    if not key:
        logger.warning(f"Token hashed with unknown key id: {key_id}")
        return False

    return hmac.compare_digest(_hmac_hex(key, token), hmac_val)


def extract_keyid_and_hash(stored_hash: str) -> Tuple[Optional[str], Optional[str]]:
    """Parse stored hash into (key_id, hmac_hex). Returns (None, None) if not parseable."""
    if not stored_hash or SEPARATOR not in stored_hash:
        return None, None
    key_id, h = stored_hash.split(SEPARATOR, 1)
    return key_id, h


# -------------------------
# JWT INTEGRATION
# -------------------------
def verify_jwt_token(token_obj) -> bool:
    """
    Verify JWT token (RefreshToken or AccessToken) against blacklist using hashed token.
    Example:
        verify_jwt_token(RefreshToken('...'))
    """
    from apps.identity.models.auth_models import BlacklistedAccessToken
    return not BlacklistedAccessToken.objects.filter(token_hash=hash_token(str(token_obj))).exists()


# -------------------------
# SECURE WRAPPERS
# -------------------------
def hash_token_secure(token_str: str) -> str:
    """Delegates to hash_token()."""
    return hash_token(token_str)


def rotate_hmac_key(new_key_id: str, new_key_value: str) -> None:
    """Add a new key and set it as current."""
    keys = getattr(settings, KEYS_SETTING_NAME, {})
    keys[new_key_id] = new_key_value
    setattr(settings, KEYS_SETTING_NAME, keys)
    setattr(settings, CURRENT_KEY_SETTING, new_key_id)
    logger.info(f"HMAC key rotated to {new_key_id}")


# -------------------------
# TOKEN NORMALIZATION
# -------------------------
def normalize_token_value(token: str) -> str:
    """Decode URL-encoded token and strip whitespace."""
    return unquote(token).strip() if token else ""


def mask_email(email: str) -> str:
    """Mask email for privacy, e.g., 'jo***@example.com'."""
    if not email or '@' not in email:
        return email
    parts = email.split('@')
    return f"{parts[0][:2]}***@{parts[1]}"

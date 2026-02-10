# users/views/password/helpers.py
"""
Password-specific helper utilities.
Handles suspicious attempt logging, cooldowns, and rate-limiting.
"""

import logging
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# -------------------------
# CONFIG
# -------------------------
SUSPICIOUS_ATTEMPTS_CACHE_KEY = "suspicious_reset_attempts"
RESET_COOLDOWN_MINUTES = 5
MAX_FAILED_ATTEMPTS = 5
BLOCK_DURATION_MINUTES = 20
MAX_CACHE_ENTRIES = 500  # Keep only last 500 attempts


# -------------------------
# HELPERS
# -------------------------
def record_password_suspicious_attempt(ip: str, token: str = "", email: str = "", reason: str = ""):
    """
    Log suspicious password-reset attempts in cache & logger.
    Keeps only the last MAX_CACHE_ENTRIES entries to prevent memory bloat.
    """
    try:
        entry = {
            "ts": timezone.now().isoformat(),
            "ip": ip,
            "token": token[:32] if token else "",
            "email": email[:64] if email else "",
            "reason": reason,
        }
        attempts = cache.get(SUSPICIOUS_ATTEMPTS_CACHE_KEY, [])
        attempts.append(entry)
        cache.set(SUSPICIOUS_ATTEMPTS_CACHE_KEY, attempts[-MAX_CACHE_ENTRIES:], timeout=7 * 24 * 3600)
        logger.warning(f"[password suspicious reset] {reason} ip={ip}")
    except Exception:
        logger.exception("Failed to record suspicious password attempt")

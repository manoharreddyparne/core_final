# users/services/brute_force_service.py
import logging
import time
from typing import Dict, Optional

from django.core.cache import cache

from apps.identity import constants

logger = logging.getLogger(__name__)

# Config: use constants when available, else sensible defaults
MAX_FAILED_ATTEMPTS = getattr(constants, "MAX_FAILED_ATTEMPTS", 5)
COOLDOWN_SECONDS = getattr(constants, "LOGIN_COOLDOWN_SECONDS", 60)
BLOCK_DURATION_MINUTES = getattr(constants, "LOCKOUT_MINUTES", 5)
BLOCK_DURATION_SECONDS = BLOCK_DURATION_MINUTES * 60

# Cache key templates
FAIL_KEY_TPL = "bf:fail:{identifier}:{ip}"
BLOCK_KEY_TPL = "bf:block:{identifier}:{ip}"


def _fail_key(identifier: str, ip: str) -> str:
    return FAIL_KEY_TPL.format(identifier=identifier.lower(), ip=ip)


def _block_key(identifier: str, ip: str) -> str:
    return BLOCK_KEY_TPL.format(identifier=identifier.lower(), ip=ip)


def register_failed_attempt(identifier: str, ip: str) -> int:
    """
    Increment failed attempt counter for (identifier, ip).
    If threshold reached, set a temporary block entry.
    Returns the new fail count.
    """
    key = _fail_key(identifier, ip)
    try:
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, timeout=COOLDOWN_SECONDS)
        logger.debug(f"[bruteforce] register_failed_attempt {identifier}@{ip} => {attempts}")

        if attempts >= MAX_FAILED_ATTEMPTS:
            # create block entry with locked_until timestamp
            locked_until = int(time.time()) + BLOCK_DURATION_SECONDS
            cache.set(_block_key(identifier, ip), {"locked_until": locked_until, "attempts": attempts}, timeout=BLOCK_DURATION_SECONDS)
            cache.delete(key)  # reset fail counter
            logger.warning(f"[bruteforce] Blocking {identifier}@{ip} until {locked_until}")
        return attempts
    except Exception as e:
        logger.exception(f"[bruteforce] register_failed_attempt error for {identifier}@{ip}: {e}")
        return 0


def check_brute_force(identifier: str, ip: str) -> Dict[str, int]:
    """
    Check whether (identifier, ip) is currently blocked.
    Returns dict:
      {
        "blocked": bool,
        "cooldown": seconds remaining (0 when not blocked)
      }
    """
    try:
        block = cache.get(_block_key(identifier, ip))
        if block:
            now = int(time.time())
            locked_until = int(block.get("locked_until", 0))
            if now < locked_until:
                cooldown = locked_until - now
                logger.debug(f"[bruteforce] check_brute_force blocked {identifier}@{ip} cooldown={cooldown}")
                return {"blocked": True, "cooldown": cooldown}
            # block expired: cleanup
            cache.delete(_block_key(identifier, ip))
        return {"blocked": False, "cooldown": 0}
    except Exception as e:
        logger.exception(f"[bruteforce] check_brute_force error for {identifier}@{ip}: {e}")
        return {"blocked": False, "cooldown": 0}


def clear_failed_attempt(identifier: str, ip: str) -> None:
    """
    Clear any failed attempt counter and block for (identifier, ip).
    Call on successful login.
    """
    try:
        cache.delete(_fail_key(identifier, ip))
        cache.delete(_block_key(identifier, ip))
        logger.debug(f"[bruteforce] cleared attempts and block for {identifier}@{ip}")
    except Exception as e:
        logger.exception(f"[bruteforce] clear_failed_attempt error for {identifier}@{ip}: {e}")


def get_block_info(identifier: str, ip: str) -> Optional[Dict]:
    """
    Return block metadata if present, else None.
    Useful for diagnostics / admin views.
    """
    try:
        block = cache.get(_block_key(identifier, ip))
        if not block:
            return None
        now = int(time.time())
        locked_until = int(block.get("locked_until", 0))
        remaining = max(0, locked_until - now)
        return {"attempts": block.get("attempts", 0), "locked_until": locked_until, "cooldown": remaining}
    except Exception as e:
        logger.exception(f"[bruteforce] get_block_info error for {identifier}@{ip}: {e}")
        return None

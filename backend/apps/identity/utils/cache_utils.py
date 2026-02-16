from hashlib import sha256
from django.core.cache import cache
from apps.identity.constants import CACHE_KEY_SALT


def make_cache_key(prefix: str, identifier: str, ip: str) -> str:
    from apps.identity.constants import CACHE_KEY_SALT
    raw = f"{prefix}:{identifier.lower()}:{ip}:{CACHE_KEY_SALT}"
    return sha256(raw.encode()).hexdigest()


# --- Backward-compatible alias for legacy imports ---
def cache_key(prefix: str, identifier: str, ip: str) -> str:
    return make_cache_key(prefix, identifier, ip)


def cache_set(key: str, value, timeout: int):
    cache.set(key, value, timeout=timeout)


def cache_get(key: str, default=None):
    return cache.get(key, default)


def cache_delete(key: str):
    cache.delete(key)

# users/utils/device_utils.py
from hashlib import sha256
from django.conf import settings
from apps.identity.constants import DEFAULT_IP

def get_device_hash(ip: str, user_agent: str, salt: str = "") -> str:
    """
    Normalize device fingerprint to UA + salt only.
    IP is intentionally ignored for stability.
    """
    ua = user_agent or "unknown"
    raw = f"static:{ua}:{salt or ''}"
    return sha256(raw.encode()).hexdigest()

def is_local_dev(ip: str) -> bool:
    return ip in ("127.0.0.1", "::1", "localhost") or getattr(settings, "DEBUG", False)

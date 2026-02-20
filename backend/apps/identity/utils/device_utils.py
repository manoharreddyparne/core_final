# users/utils/device_utils.py
from hashlib import sha256
from django.conf import settings
from apps.identity.constants import DEFAULT_IP

def get_device_hash(ip: str, user_agent: str, salt: str = "") -> str:
    """
    Fingerprint device using IP + User-Agent + Salt.
    Strictly binds token to the physical machine and network context.
    """
    ua = user_agent or "unknown"
    addr = ip or "unknown"
    
    # ✅ Normalize localhost to avoid fragile hashes on dev machines
    if addr in ("127.0.0.1", "::1", "localhost"):
        addr = "127.0.0.1"
        
    raw = f"{addr}:{ua}:{salt or ''}"
    return sha256(raw.encode()).hexdigest()

def is_local_dev(ip: str) -> bool:
    return ip in ("127.0.0.1", "::1", "localhost") or getattr(settings, "DEBUG", False)

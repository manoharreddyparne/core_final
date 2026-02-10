#src/utils/request_utils.py
import logging
from typing import Optional
from django.http import HttpRequest

logger = logging.getLogger(__name__)

def get_client_ip(request: HttpRequest) -> Optional[str]:
    """
    Safely extract the real client IP address from a Django request.
    Prioritizes X-Forwarded-For if behind a reverse proxy (e.g., Nginx/Cloudflare).
    Falls back to REMOTE_ADDR if no forwarded header is set.
    """
    ip = None
    try:
        # Check for reverse proxy headers (common in production)
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # In case of multiple IPs, the first one is the original client IP
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR", "")
    except Exception as e:
        logger.warning(f"[get_client_ip] Failed to extract IP: {e}", exc_info=True)
        ip = None

    # Optional: sanitize loopback/local IPs in production logs
    # But for Auth logic (OTP, cache keys), we need the real IP.
    if ip in (None, ""):
        return "unknown"

    return ip

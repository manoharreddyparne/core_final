#src/utils/request_utils.py
import logging
from typing import Optional
from django.http import HttpRequest
import httpagentparser
from django.conf import settings
from django.contrib.gis.geoip2 import GeoIP2

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

def get_location(ip: str):
    """Return geo-location data from IP, or None if unavailable."""
    if not ip or not getattr(settings, "GEOIP_PATH", None):
        return None
    try:
        g = GeoIP2()
        city_data = g.city(ip)
        return {
            "city": city_data.get("city") or "Unknown",
            "region": city_data.get("region") or "Unknown",
            "country": city_data.get("country_name") or "Unknown",
            "latitude": city_data.get("latitude"),
            "longitude": city_data.get("longitude"),
        }
    except Exception:
        logger.debug(f"GeoIP lookup failed for IP {ip}")
        return None


def parse_device_info(user_agent: str):
    """Return device type, OS, and browser from user-agent."""
    if not user_agent:
        return {"device_type": "Unknown", "os": "Unknown", "browser": "Unknown"}

    parsed = httpagentparser.simple_detect(user_agent)
    os_name, browser_name = parsed
    device_type = "Mobile" if any(k in user_agent.lower() for k in ["mobile", "android", "iphone"]) else "Desktop"
    return {"device_type": device_type, "os": os_name, "browser": browser_name}

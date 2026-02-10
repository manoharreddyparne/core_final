#users/utils/session_utils.py
import logging
from django.conf import settings
from django.contrib.gis.geoip2 import GeoIP2
import httpagentparser
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

REFRESH_COOKIE_PATH = getattr(settings, "REFRESH_COOKIE_PATH", "/")

def success_response(message, data=None, status_code=status.HTTP_200_OK):
    """Standardized success response for API views."""
    payload = {"detail": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)


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

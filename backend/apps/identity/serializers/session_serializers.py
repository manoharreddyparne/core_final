# users/serializers/session_serializers.py

import logging
from typing import Optional
from rest_framework import serializers
from django.contrib.gis.geoip2 import GeoIP2, GeoIP2Exception
from apps.identity.models.auth_models import LoginSession
from django.core.cache import cache

logger = logging.getLogger(__name__)


class LoginSessionSerializer(serializers.ModelSerializer):
    is_current = serializers.SerializerMethodField()
    last_active = serializers.SerializerMethodField()
    location = serializers.SerializerMethodField()

    class Meta:
        model = LoginSession
        fields = [
            "id",
            "device",
            "ip_address",
            "user_agent",
            "created_at",
            "expires_at",
            "is_active",
            "is_current",
            "last_active",
            "location",
        ]
        read_only_fields = fields

    # -------------------------------
    # Determine if this is the current session
    # -------------------------------
    def get_is_current(self, obj) -> bool:
        request = self.context.get("request")
        if not request:
            return False
        try:
            token_payload = getattr(request, "auth", None)
            token_jti = token_payload.get("jti") if token_payload else None
            return token_jti == obj.jti
        except Exception:
            logger.debug(f"Failed to determine if session {obj.id} is current")
            return False

    # -------------------------------
    # Last active timestamp
    # -------------------------------
    def get_last_active(self, obj) -> str:
        dt = getattr(obj, "last_active", None) or obj.created_at
        return dt.isoformat()

    # -------------------------------
    # Geo location from IP
    # -------------------------------
    def get_location(self, obj) -> Optional[dict]:
        ip = obj.ip_address
        if not ip:
            return None

        # Handle local IPs for dev
        if ip.startswith("127.") or ip in ("localhost", "::1"):
            return {
                "city": "Localhost",
                "region": "Localhost",
                "country": "Localhost",
                "latitude": None,
                "longitude": None,
            }

        # Check cache first
        cache_key = f"geoip:{ip}"
        cached_location = cache.get(cache_key)
        if cached_location:
            return cached_location

        try:
            g = GeoIP2()
            city_data = g.city(ip)
            location = {
                "city": city_data.get("city") or "Unknown",
                "region": city_data.get("region") or "Unknown",
                "country": city_data.get("country_name") or "Unknown",
                "latitude": city_data.get("latitude"),
                "longitude": city_data.get("longitude"),
            }
            # Cache for 1 hour
            cache.set(cache_key, location, timeout=3600)
            return location
        except GeoIP2Exception as e:
            logger.warning(f"GeoIP2 lookup failed for IP {ip}: {e}")
        except Exception:
            logger.exception(f"Unexpected error fetching geo info for IP {ip}")

        # fallback
        return {
            "city": "Unknown",
            "region": "Unknown",
            "country": "Unknown",
            "latitude": None,
            "longitude": None,
        }

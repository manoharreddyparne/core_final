# users/views/api_views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.conf import settings
from apps.identity.utils.response_utils import success_response
from apps.identity.models import LoginSession
import logging

logger = logging.getLogger(__name__)


class UpdateSessionLocationView(APIView):
    """Update current session's location from browser geolocation API"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not latitude or not longitude:
            return success_response("Missing coordinates", code=400)
        
        user = request.user
        from apps.identity.models.core_models import User
        
        # Get current session from JWT
        jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)
        
        if not jti:
            return success_response("No session found", code=400)
        
        try:
            from django.db.models import Q
            # Multi-tenant aware session lookup
            if hasattr(user, 'email') and not isinstance(user, User):
                schema = getattr(request.auth, 'get', lambda x, y: '')('schema', '')
                session = LoginSession.objects.filter(tenant_user_id=user.id, tenant_schema=schema, jti=jti, is_active=True).first()
            else:
                session = LoginSession.objects.filter(user=user, jti=jti, is_active=True).first()

            if session:
                session.latitude = float(latitude)
                session.longitude = float(longitude)
                session.save(update_fields=['latitude', 'longitude'])
                logger.info(f"Updated location for session {session.id}: {latitude}, {longitude}")
                return success_response("Location updated")
            else:
                return success_response("Session not found", code=404)
        except Exception as e:
            logger.exception("Failed to update session location")
            return success_response("Failed to update location", code=500)


class PublicConfigView(APIView):
    """
    Returns public-safe application configuration.
    Used by frontend to get Turnstile site key, app name, etc.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({
            "turnstile_site_key": settings.TURNSTILE_SITE_KEY,
            "turnstile_enabled": settings.TURNSTILE_ENABLED,
            "app_name": "AUIP Platform",
            "environment": "development" if settings.DEBUG else "production"
        })

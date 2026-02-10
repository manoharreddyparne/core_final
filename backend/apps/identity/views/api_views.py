# users/views/api_views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.identity.utils.session_utils import success_response
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
            return success_response("Missing coordinates", status_code=400)
        
        user = request.user
        
        # Get current session from JWT
        jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)
        
        if not jti:
            return success_response("No session found", status_code=400)
        
        try:
            session = LoginSession.objects.filter(user=user, jti=jti, is_active=True).first()
            if session:
                session.latitude = float(latitude)
                session.longitude = float(longitude)
                session.save(update_fields=['latitude', 'longitude'])
                logger.info(f"Updated location for session {session.id}: {latitude}, {longitude}")
                return success_response("Location updated")
            else:
                return success_response("Session not found", status_code=404)
        except Exception as e:
            logger.exception("Failed to update session location")
            return success_response("Failed to update location", status_code=500)

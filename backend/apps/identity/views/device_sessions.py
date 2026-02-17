# users/views/device_sessions.py
import logging
from typing import Any, Dict
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.identity.models import LoginSession, User
from apps.identity.services.token_service import send_session_ws_event, logout_all_sessions_secure
from apps.identity.utils.request_utils import get_client_ip, get_location, parse_device_info
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.cookie_utils import clear_session_cookies

logger = logging.getLogger(__name__)

# -------------------------------
# LIST USER SESSIONS / DEVICES
# -------------------------------
class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Any:
        user: User = request.user
        
        # Get current session JTI from JWT token
        current_jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)

        # Deactivate expired sessions
        for session in LoginSession.objects.filter(user=user, is_active=True):
            session.deactivate_if_expired()

        sessions_data: list[Dict[str, Any]] = []
        for session in LoginSession.objects.filter(user=user, is_active=True).order_by("-created_at"):
            location = get_location(session.ip_address)
            device_info = parse_device_info(session.user_agent)
            
            is_current = session.jti == current_jti
            
            sessions_data.append({
                "id": session.id,
                "jti": session.jti,
                "is_active": session.is_active,
                "created_at": session.created_at,
                "last_active": session.last_active,
                "expires_at": session.expires_at,
                "ip_address": session.ip_address,
                "location": location,
                "device": session.device,
                "device_type": device_info.get("device_type"),
                "os": device_info.get("os"),
                "browser": device_info.get("browser"),
                "user_agent": session.user_agent,  # Added
                "latitude": session.latitude,       # Added
                "longitude": session.longitude,     # Added
                "is_current": is_current,          # Added
            })
        
        # Sort: current device first, then by last_active
        sessions_data.sort(key=lambda s: (not s['is_current'], -s['last_active'].timestamp()))

        return success_response("Active sessions retrieved", data=sessions_data)

# -------------------------------
# LOGOUT SINGLE SESSION
# -------------------------------
class SessionLogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk: int, *args, **kwargs) -> Any:
        user: User = request.user

        try:
            session = LoginSession.objects.get(pk=pk, user=user)
        except LoginSession.DoesNotExist:
            return success_response("Session not found", status_code=404)

        # Even if inactive, we might want to delete/hide it, but logic here says "deactivate"
        if not session.is_active:
            return success_response("Session already inactive", status_code=400)

        try:
            session.is_active = False
            session.save(update_fields=["is_active"])
            
            # Notify the specific session to force logout
            send_session_ws_event(user.id, "force_logout", session.id, session.jti)
            
            logger.info(f"Session {session.pk} deactivated for user {user.email}")
            return success_response("Session logged out successfully")

        except Exception:
            logger.exception("Failed to logout session")
            return success_response("Failed to logout session", status_code=500)

    def post(self, request, *args, **kwargs) -> Any:
        """Compatibility for POST-based logout"""
        return self.delete(request, *args, **kwargs)

# -------------------------------
# LOGOUT ALL SESSIONS
# -------------------------------
class SessionLogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs) -> Any:
        user: User = request.user
        exclude_current = request.query_params.get("exclude_current", "false").lower() == "true"
        
        current_session_jti = None
        if exclude_current:
            try:
                # Extract JTI from the current access token (SafeJWTAuthentication sets this)
                current_session_jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)
            except Exception:
                pass

        try:
            logout_all_sessions_secure(user, exclude_jti=current_session_jti)
            msg = "Logged out of other devices" if exclude_current else "All sessions logged out successfully"
            resp = success_response(msg)
            if not exclude_current:
                clear_session_cookies(resp)
            return resp
        except Exception:
            logger.exception("Failed to logout all sessions")
            return success_response("Failed to logout all sessions", status_code=500)

    def post(self, request, *args, **kwargs) -> Any:
        """Compatibility for POST-based logout"""
        return self.delete(request, *args, **kwargs)


class SessionValidateView(APIView):
    """
    Validate if the current session is still active.
    Used to detect if user was logged out while offline.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Any:
        user: User = request.user
        
        # Get current session JTI from JWT token
        jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)
        
        if not jti:
            logger.warning(f"[SESSION-VAL] ❌ No JTI in token for user {user.email}")
            return success_response("No session identifier found", data={
                "is_valid": False,
                "was_logged_out": True,
                "reason": "no_jti"
            }, status_code=400)
        
        try:
            session = LoginSession.objects.filter(user=user, jti=jti).first()
            
            if not session:
                logger.warning(f"[SESSION-VAL] ⚠️ Session NOT FOUND in DB: {jti} for user {user.email}")
                return success_response("Session not found", data={
                    "is_valid": False,
                    "was_logged_out": True,
                    "reason": "session_not_found"
                })
            
            if not session.is_active:
                logger.warning(f"[SESSION-VAL] 🛑 Session INACTIVE in DB: {jti} (IP: {session.ip_address})")
                return success_response("Session inactive", data={
                    "is_valid": False,
                    "was_logged_out": True,
                    "reason": "logged_out_from_another_device"
                })
            
            # Session is valid
            return success_response("Session valid", data={
                "is_valid": True,
                "last_active": session.last_active,
                "expires_at": session.expires_at
            })
            
        except Exception as e:
            logger.exception(f"Failed to validate session: {e}")
            return success_response("Failed to validate session", status_code=500)

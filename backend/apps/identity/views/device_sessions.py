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
        from django.db.models import Q
        user = request.user
        
        # Get current session JTI from JWT token
        current_jti = getattr(request.auth, 'get', lambda x, y: None)('jti', None)

        role = getattr(request.auth, 'get', lambda x, y: None)('role', None) or getattr(user, 'role', None)
        schema = getattr(request.auth, 'get', lambda x, y: '')('schema', '')

        if hasattr(user, 'email') and not isinstance(user, User):
            # Tenant isolated User (Student/Faculty/InstAdmin)
            session_filter = Q(tenant_user_id=user.id, tenant_schema=schema, role=role)
        else:
            # Global User (Super Admin/Inst Admin)
            # 🛡️ ISOLATION: Only show sessions belonging to the current ROLE and SCHEMA context.
            session_filter = Q(user=user, role=role)
            if schema:
                session_filter &= Q(tenant_schema=schema)
            else:
                # If no schema context (SuperAdmin portal), only show global sessions
                session_filter &= Q(tenant_schema='')

        # Deactivate expired sessions
        for session in LoginSession.objects.filter(session_filter, is_active=True):
            session.deactivate_if_expired()

        sessions_data: list[Dict[str, Any]] = []
        for session in LoginSession.objects.filter(session_filter, is_active=True).order_by("-created_at"):
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

        role = getattr(request.auth, 'get', lambda x, y: None)('role', None) or getattr(user, 'role', None)
        schema = getattr(request.auth, 'get', lambda x, y: '')('schema', '')

        try:
            if hasattr(user, 'email') and not isinstance(user, User):
                 session = LoginSession.objects.get(pk=pk, tenant_user_id=user.id, tenant_schema=schema, role=role)
            else:
                 # 🛡️ ISOLATION: Verify context ownership before allowing logout
                 session = LoginSession.objects.get(pk=pk, user=user, role=role, tenant_schema=schema if schema else '')
        except LoginSession.DoesNotExist:
            return success_response("Session not found", code=404)

        # Even if inactive, we might want to delete/hide it, but logic here says "deactivate"
        if not session.is_active:
            return success_response("Session already inactive", code=400)

        try:
            # Extract schema from token for correct multi-tenant context
            schema = getattr(request.auth, 'get', lambda x, y: None)('schema', None)
            
            from apps.identity.services.token_service import logout_single_session_secure
            logout_single_session_secure(user, session_id=pk, schema=schema)
            
            logger.info(f"Session {pk} deactivated for user {user.email}")
            return success_response("Session logged out successfully")

        except Exception:
            logger.exception("Failed to logout session")
            return success_response("Failed to logout session", code=500)

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
            # Extract schema from token if it exists (for multi-tenant sessions)
            schema = getattr(request.auth, 'get', lambda x, y: None)('schema', None)
            
            logout_all_sessions_secure(user, exclude_jti=current_session_jti, schema=schema)
            msg = "Logged out of other devices" if exclude_current else "All sessions logged out successfully"
            resp = success_response(msg)
            if not exclude_current:
                # Extract role to clear specific cookie
                role = getattr(user, 'role', None) or getattr(request.auth, 'get', lambda x, y: None)('role', None)
                clear_session_cookies(resp, role=role)
            return resp
        except Exception:
            logger.exception("Failed to logout all sessions")
            return success_response("Failed to logout all sessions", code=500)

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
            }, code=400)
        
        try:
            from django.db.models import Q
            from django_tenants.utils import schema_context
            
            with schema_context('public'):
                schema = getattr(request.auth, 'get', lambda x, y: '')('schema', '')
                tenant_user_id = getattr(request.auth, 'get', lambda x, y: None)('tenant_user_id', None)
                
                # Broad lookup by JTI first (check current and previous for rotation grace)
                session = LoginSession.objects.filter(
                    Q(jti=jti) | Q(previous_jti=jti),
                    is_active=True
                ).first()
                
                if not session:
                    logger.warning(f"[SESSION-VAL] ⚠️ Physical JTI NOT FOUND: {jti}")
                    return success_response("Session not found", data={
                        "is_valid": False,
                        "was_logged_out": True,
                        "reason": "session_not_found"
                    })

                # Check Grace Period if matching by previous_jti
                if session.jti != jti and session.previous_jti == jti:
                    from django.utils import timezone
                    grace_seconds = 60
                    if not session.rotated_at or (timezone.now() - session.rotated_at).total_seconds() > grace_seconds:
                         logger.warning(f"[SESSION-VAL] 🛑 Previous JTI used AFTER grace period: {jti}")
                         return success_response("Rotation grace expired", data={
                            "is_valid": False,
                            "was_logged_out": True,
                            "reason": "rotation_grace_expired"
                        })
                    logger.debug(f"[SESSION-VAL] 🔄 Allowing previous JTI within grace period: {jti}")

                # Identity Verification: Ensure the session belongs to the requesting user
                identity_match = False
                if schema and tenant_user_id:
                    # Tenant user
                    if session.tenant_user_id == tenant_user_id and session.tenant_schema == schema:
                        identity_match = True
                else:
                    # Global user
                    if session.user_id == user.id:
                        identity_match = True
                        
                if not identity_match:
                    logger.warning(f"[SESSION-VAL] 🛑 Identity Mismatch for JTI {jti}")
                    return success_response("Identity mismatch", data={
                        "is_valid": False,
                        "was_logged_out": True,
                        "reason": "identity_mismatch"
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
            return success_response("Failed to validate session", code=500)

# ✅ IMPROVED — CONSISTENT, SECURE, STRAIGHTFORWARD
# users/views/profile/settings_security.py

import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from users.models import LoginSession, User
from users.services.token_service import (
    send_session_ws_event,
    logout_all_sessions_secure,
    logout_single_session_secure,
)
from users.utils.session_utils import get_location, parse_device_info
from users.utils.response_utils import success_response, error_response
from users.utils.cookie_utils import clear_session_cookies
from users.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


class SettingsSecurityView(APIView):
    """
    Security settings + device session management
    ✅ GET  — list all sessions
    ✅ POST — logout one / logout all
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: User = request.user

        try:
            # auto-deactivate expired ones
            active_sessions = LoginSession.objects.filter(user=user, is_active=True)
            for s in active_sessions:
                s.deactivate_if_expired()

            session_list = []
            for session in LoginSession.objects.filter(user=user).order_by("-created_at"):
                loc = get_location(session.ip_address)
                device_info = parse_device_info(session.user_agent)

                session_list.append(
                    {
                        "id": session.id,
                        "jti": session.jti,
                        "is_active": session.is_active,
                        "created_at": session.created_at,
                        "last_active": session.last_active,
                        "expires_at": session.expires_at,
                        "ip_address": session.ip_address,
                        "location": loc,
                        "device": session.device,
                        "login_type": "web",
                        "device_type": device_info.get("device_type"),
                        "os": device_info.get("os"),
                        "browser": device_info.get("browser"),
                    }
                )

            payload = {
                "two_factor_enabled": getattr(user, "two_factor_enabled", False),
                "recent_sessions": session_list,
            }

            return success_response("Security settings retrieved.", data=payload)

        except Exception as exc:
            logger.exception(
                "[SettingsSecurityView][GET] failed | user=%s | error=%s",
                user.id, exc
            )
            return error_response("Unable to fetch security settings.", code=500)

    # ---------------------------------------------------------------------

    def post(self, request):
        """
        Controls:
        ✅ logout single → { action: "logout", session_id }
        ✅ logout all    → { action: "logout_all" }
        """
        user: User = request.user
        action = request.data.get("action")
        session_id = request.data.get("session_id")
        ip = get_client_ip(request)

        try:
            # LOGOUT ALL
            if action == "logout_all":
                count = logout_all_sessions_secure(user)
                resp = success_response(
                    "Logged out from all devices.",
                    data={"count": count},
                )
                clear_session_cookies(resp)

                logger.info(
                    "[SECURITY] logout_all | user=%s (%s) | ip=%s | count=%s",
                    user.id, user.email, ip, count
                )
                return resp

            # LOGOUT SINGLE
            if action == "logout" and session_id:
                session = LoginSession.objects.filter(user=user, id=session_id).first()
                if not session or not session.is_active:
                    return error_response("Session not found or inactive.", code=404)

                logout_single_session_secure(
                    user=user,
                    access_jti=session.jti,
                )

                resp = success_response("Session logged out.")

                # user is nuking their own active session
                if getattr(request, "access_jti", None) == session.jti:
                    clear_session_cookies(resp)

                logger.info(
                    "[SECURITY] logout_one | user=%s (%s) | session=%s",
                    user.id, user.email, session_id
                )

                return resp

            return error_response("Invalid action or missing session_id.", code=400)

        except Exception as exc:
            logger.exception(
                "[SettingsSecurityView][POST] failed | user=%s | action=%s | error=%s",
                user.id, action, exc
            )
            return error_response("Failed to perform request.", code=500)

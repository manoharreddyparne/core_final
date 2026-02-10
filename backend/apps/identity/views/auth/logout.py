# users/views/auth/logout.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.authentication import SafeJWTAuthentication
from users.services.token_service import (
    logout_single_session_secure,
    logout_all_sessions_secure,
)
from users.utils.response_utils import success_response
from users.utils.cookie_utils import clear_session_cookies
from users.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)

REFRESH_COOKIE_NAME = "refresh_token"


class LogoutView(APIView):
    """
    ✅ Logs out ONLY the current session.
       - Finds refresh token from cookie
       - Falls back to access JTI
       - Invalidates LoginSession
       - Clears cookies
       - Emits WS event (inside token_service)
    """

    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        ip = get_client_ip(request)

        # Prefer refresh token from cookie; fallback to access jti from request.auth
        refresh_token_str = request.COOKIES.get(REFRESH_COOKIE_NAME)
        access_jti = getattr(request, "access_jti", None)

        try:
            logout_single_session_secure(
                user=user,
                refresh_token=refresh_token_str,
                access_jti=access_jti,
            )
            logger.info(
                f"[LOGOUT] user={user.id} email={user.email} ip={ip} -> OK"
            )

        except Exception as e:
            # We still clear cookies for clean UX
            logger.warning(
                f"[LOGOUT] user={user.id} email={user.email} ip={ip} -> fail: {e}"
            )

        resp = success_response("Logged out")
        clear_session_cookies(resp)
        return resp


class LogoutAllView(APIView):
    """
    ✅ Logs out ALL sessions for this user.
       - Marks LoginSession.is_active = False on all
       - WS broadcast handled inside token_service
       - Clears cookies
    """

    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        ip = get_client_ip(request)

        try:
            count = logout_all_sessions_secure(user)
            logger.info(
                f"[LOGOUT-ALL] user={user.id} email={user.email} ip={ip} count={count}"
            )

            resp = success_response(
                "Logged out from all devices",
                data={"count": count},
            )

        except Exception as e:
            logger.error(
                f"[LOGOUT-ALL] user={user.id} email={user.email} ip={ip} -> fail: {e}"
            )
            resp = Response(
                {"detail": "Unable to logout from all sessions"},
                status=500,
            )

        clear_session_cookies(resp)
        return resp

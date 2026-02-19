# users/views/auth/logout.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.services.token_service import (
    logout_single_session_secure,
    logout_all_sessions_secure,
)
from apps.identity.utils.response_utils import success_response
from apps.identity.utils.cookie_utils import clear_session_cookies
from apps.identity.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


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

        # Reconstruct refresh from fragments
        from apps.identity.services.quantum_shield import QuantumShieldService
        refresh_token_str, _ = QuantumShieldService.reconstruct_token(request.COOKIES)
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
        role = getattr(user, 'role', None) 
        clear_session_cookies(resp, role=role)
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

        role = getattr(user, 'role', None)
        clear_session_cookies(resp, role=role)
        return resp

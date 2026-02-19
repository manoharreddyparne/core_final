import logging
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.exceptions import AuthenticationFailed
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from apps.identity.services.token_service import create_login_session_safe

logger = logging.getLogger(__name__)

class BaseSocialLoginView(SocialLoginView):
    """Base class for social logins. Handles logging & safe JWT session creation."""

    permission_classes = [permissions.AllowAny]

    def _handle_first_time_login(self, user):
        return getattr(user, "first_time_login", False) or getattr(user, "need_password_reset", False)

    def _safe_login_session(self, user, response, ip, ua):
        access = response.data.get("access_token") or response.data.get("access")
        refresh = response.data.get("refresh_token") or response.data.get("refresh")
        
        if not access or not refresh:
            return

        # 1. Create DB Login Session
        session = create_login_session_safe(
            user=user,
            access_token=access,
            refresh_token=refresh,
            ip=ip,
            user_agent=ua,
        )

        # 2. Generate and set Fragments
        from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
        from apps.identity.services.quantum_shield import QuantumShieldService
        
        fragments = QuantumShieldService.fragment_token(str(refresh))
        
        set_quantum_shield(response, fragments)
        set_logged_in_cookie(response, "true", role=user.role)

    def post(self, request, *args, **kwargs):
        ip = request.META.get("REMOTE_ADDR", "")
        logger.info(f"{self.__class__.__name__} attempt from IP: {ip}")

        try:
            response = super().post(request, *args, **kwargs)
            user = getattr(request, "user", None) or getattr(response, "user", None)

            if user and getattr(user, "email", None):
                if self._handle_first_time_login(user):
                    return Response(
                        {"detail": "First-time login, please reset your password."},
                        status=403,
                    )

                ua = request.META.get("HTTP_USER_AGENT", "unknown")
                self._safe_login_session(user, response, ip, ua)
                logger.info(f"{self.__class__.__name__} successful for {user.email} from IP: {ip}")

            return response

        except AuthenticationFailed:
            logger.warning(f"{self.__class__.__name__} failed for IP: {ip}")
            return Response({"detail": "Account does not exist. Contact admin."}, status=400)
        except OAuth2Error:
            logger.warning(f"{self.__class__.__name__} OAuth2 error for IP: {ip}")
            return Response({"detail": "OAuth2 authentication failed."}, status=400)
        except Exception as e:
            logger.error(f"Unexpected error during {self.__class__.__name__}: {str(e)}", exc_info=True)
            return Response({"detail": "Internal server error"}, status=500)

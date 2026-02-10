# users/middleware.py

import logging
from django.utils.functional import SimpleLazyObject
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from users.authentication import SafeJWTAuthentication
from users.models import LoginSession
from users.services.token_service import send_session_ws_event

logger = logging.getLogger(__name__)

class AccessTokenSessionMiddleware:
    """
    Middleware to attach authenticated user to HTTP requests based on active LoginSession.
    Handles:
    - AnonymousUser fallback
    - Auto-clean expired sessions
    - Updates last_active timestamp for active sessions
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.user = SimpleLazyObject(lambda: self._get_user_safe(request))
        return self.get_response(request)

    def _get_user_safe(self, request):
        try:
            user = self.get_user(request)
            return user or AnonymousUser()
        except AuthenticationFailed as e:
            logger.warning(f"Blocked request due to authentication failure: {e}")
            return AnonymousUser()
        except Exception as e:
            logger.error(f"Error processing authentication: {e}", exc_info=True)
            return AnonymousUser()

    def get_user(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token_str = auth_header.split()[1].strip()
            if not token_str:
                return None

            auth = SafeJWTAuthentication()
            result = auth.authenticate(request)
            if result is None:
                return None
            user, validated_token = result
            jti = validated_token.get("jti")
            if jti:
                try:
                    # Auto-clean expired sessions
                    expired_qs = LoginSession.objects.filter(
                        user=user, jti=jti, expires_at__lt=timezone.now(), is_active=True
                    )
                    for session in expired_qs:
                        session.deactivate()
                        send_session_ws_event(user.id, "force_logout", session.id)
                except Exception:
                    logger.debug("Failed to auto-clean expired login session")

                # Update last_active for active session
                session_qs = LoginSession.objects.filter(user=user, jti=jti, is_active=True)
                if not session_qs.exists():
                    logger.warning(f"Inactive or missing session for user {getattr(user,'email', 'unknown')}, jti={jti}")
                    raise AuthenticationFailed("Session is no longer active.", code="session_inactive")

                for session in session_qs:
                    session.last_active = timezone.now()
                    session.save(update_fields=["last_active"])

            return user

        return None

import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.identity.services.token_service import authenticate_access_token
from apps.identity.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


class SafeJWTAuthentication(JWTAuthentication):
    """
    ✅ Validates access token against:
       • JWT signature + expiry
       • DB session whitelist
       • Device fingerprint
    ✅ Attaches:
       • request.user
       • request.access_jti
    """

    def authenticate(self, request):
        """
        Extract access token → validate → enforce session + fingerprint
        """
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result

        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT") or "unknown"

        try:
            # ✅ Validate access via service
            authenticate_access_token(
                token_str=str(validated_token),
                ip=ip,
                user_agent=user_agent,
            )
        except Exception as e:
            logger.warning(
                f"[AUTH] access rejected user={getattr(user,'id',None)} ip={ip} err={e}"
            )
            raise AuthenticationFailed("Invalid or expired access token")

        # ✅ Attach JTI to request for logout-session logic
        request.access_jti = validated_token.get("jti")

        return user, validated_token

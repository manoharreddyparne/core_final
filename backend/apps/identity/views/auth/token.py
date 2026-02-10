# users/views/auth/token.py
import logging
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.authentication import SafeJWTAuthentication
from users.services.token_service import rotate_tokens_secure
from users.utils.request_utils import get_client_ip
from users.utils.response_utils import success_response
from users.utils.cookie_utils import set_refresh_cookie

logger = logging.getLogger(__name__)

MAX_FAILED_ROTATIONS = 5
ROTATION_COOLDOWN = 5  # seconds
REFRESH_COOKIE_NAME = "refresh_token"


class CustomTokenSecureView(APIView):
    """
    ✅ Purpose:
        - Rotate refresh + access tokens
        - Emit WS "rotated" (handled inside token_service)
        - Smooth UX: same session continues
        - Used when user clicks "Secure Device" in dashboard
    """

    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Pull refresh from body OR cookie
        old_refresh = (
            request.data.get("refresh")
            or request.COOKIES.get(REFRESH_COOKIE_NAME)
        )
        if not old_refresh:
            return Response({"detail": "Refresh token required"}, status=400)

        user_id = request.user.id
        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "") or "unknown"

        # 🔐 Brute-force safety
        bf_key = f"token_rotation_fail:{user_id}:{ip}"
        failed_count = cache.get(bf_key, 0)

        if failed_count >= MAX_FAILED_ROTATIONS:
            return Response(
                {
                    "detail": (
                        f"Too many attempts. "
                        f"Try again in {ROTATION_COOLDOWN}s."
                    )
                },
                status=429,
            )

        try:
            rotated_tokens = rotate_tokens_secure(
                user=request.user,
                old_refresh=old_refresh,
                ip=ip,
                user_agent=user_agent,
            )

            # ✅ Build standard response
            resp = success_response(
                "Tokens rotated",
                data={
                    "access": rotated_tokens["access"],
                    "refresh_token_present": True,
                },
            )

            # ✅ New Refresh → Set cookie
            set_refresh_cookie(resp, str(rotated_tokens["refresh"]))

            cache.delete(bf_key)

            logger.info(
                f"[ROTATE] user={user_id} ip={ip} → success"
            )
            return resp

        except Exception as e:
            cache.set(bf_key, failed_count + 1, timeout=ROTATION_COOLDOWN)
            logger.warning(
                f"[ROTATE] user={user_id} ip={ip} → fail: {e}"
            )
            return Response(
                {"detail": "Invalid or expired refresh token"},
                status=401,
            )


# ------------------------------------------------------
# ✅ Token Verify – sanity endpoint
# ------------------------------------------------------
from rest_framework_simplejwt.views import TokenVerifyView
from users.serializers.auth_serializers import SafeTokenVerifySerializer


class CustomTokenVerifyView(TokenVerifyView):
    """
    ✅ Use case:
        FE sanity check → JWT still valid
        Return standard success payload
    """
    serializer_class = SafeTokenVerifySerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return success_response("Token is valid")

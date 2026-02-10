# ✅ IMPROVED — CLEAN, SAFE, PREDICTABLE
# users/views/profile/profile_security.py

import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.serializers.password_serializers import ChangePasswordSerializer
from apps.identity.models import LoginSession

logger = logging.getLogger(__name__)


class ProfileSecurityView(APIView):
    """
    Handles security-related user operations:
    ✅ GET → device + security snapshot
    ✅ POST → update password
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            recent = (
                LoginSession.objects.filter(user=user)
                .order_by("-last_active")[:3]
                .values("ip_address", "user_agent", "last_active")
            )

            payload = {
                "last_login": user.last_login,
                "recent_devices": list(recent),
                "two_factor_enabled": getattr(user, "two_factor_enabled", False),
            }

            return success_response("Security info retrieved.", data=payload)

        except Exception as exc:
            logger.exception(
                "[ProfileSecurityView] failed to fetch security info | user=%s | error=%s",
                user.id, exc
            )
            return error_response("Could not retrieve security info.", code=500)

    def post(self, request):
        """Change password using serializer validation."""
        user = request.user
        serializer = ChangePasswordSerializer(user=user, data=request.data)

        if not serializer.is_valid():
            return error_response(
                "Invalid password data.",
                errors=serializer.errors,
                code=400
            )

        try:
            serializer.save()
            logger.info(
                "[ProfileSecurityView] password updated | user=%s (%s)",
                user.id, user.email
            )
            return success_response("Password updated successfully.")

        except Exception as exc:
            logger.exception(
                "[ProfileSecurityView] password change failed | user=%s | error=%s",
                user.id, exc
            )
            return error_response("Could not update password.", code=500)

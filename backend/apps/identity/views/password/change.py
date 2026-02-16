# users/views/password/change.py
import logging
from rest_framework import permissions
from rest_framework.views import APIView

from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.serializers.password_serializers import ChangePasswordSerializer
from apps.identity.services.password_service import change_user_password, check_password_reuse, validate_password_strength
from apps.identity.services.token_service import rotate_tokens_secure
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.response_utils import password_error, password_success
from apps.identity.utils.general_utils import serialize_user
from apps.identity.utils.cookie_utils import set_quantum_shield

logger = logging.getLogger(__name__)


class ChangePasswordView(APIView):
    """
    Authenticated endpoint to change password.
    - Validates old password (unless first_time_login / need_password_reset)
    - Checks reuse & strength
    - Changes password
    - Rotates refresh + access tokens for current device
    """
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data.get("old_password")
        new_password = serializer.validated_data.get("new_password")

        # Prevent using the same password
        if old_password and old_password == new_password:
            return password_error("New password cannot be the same as your current password.")

        # Validate old password unless forced reset
        if not getattr(user, "first_time_login", False) and not getattr(user, "need_password_reset", False):
            if not old_password or not user.check_password(old_password):
                return password_error("Old password is incorrect.")

        # Check reuse & strength
        if check_password_reuse(user, new_password):
            return password_error("This password was used recently. Try a different one.")
        valid, msg = validate_password_strength(new_password)
        if not valid:
            return password_error(msg)

        # Change password
        try:
            change_user_password(user, new_password)
        except Exception:
            logger.exception("Failed to change user password")
            return password_error("Server error while updating password.")

        ip = get_client_ip(request) or "0.0.0.0"
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # ✅ CRITICAL FIX: After password change, old refresh tokens are often invalidated 
        # by the password change itself (Django's session invalidation or hash change). 
        # We manually issue FRESH tokens for the session rather than "rotating" the old one.
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            from apps.identity.models import LoginSession
            from django.utils import timezone

            # Create fresh tokens
            refresh = RefreshToken.for_user(user)
            
            # Create a new login session record for this device
            session = LoginSession.objects.create(
                user=user,
                refresh_jti=refresh["jti"],
                ip_address=ip,
                user_agent=user_agent,
                is_active=True,
                expires_at=timezone.now() + timezone.timedelta(days=7) # Standard duration
            )

            resp = password_success(
                "Password updated successfully.",
                data={"access": str(refresh.access_token), "user": serialize_user(user)}
            )
            # Set 4-part Quantum Shield cookies
            from apps.identity.services.quantum_shield import QuantumShieldService
            fragments = QuantumShieldService.fragment_token(str(refresh))
            set_quantum_shield(resp, fragments)

            # Clear first_time_login / need_password_reset flags
            if getattr(user, "need_password_reset", False) or getattr(user, "first_time_login", False):
                user.need_password_reset = False
                user.first_time_login = False
                user.save(update_fields=["need_password_reset", "first_time_login"])

            logger.info(f"✅ Password changed and NEW session issued for user {user.id} from IP {ip}")
            return resp

        except Exception as e:
            logger.exception(f"Password change session renewal failed for user {user.id}: {e}")
            return password_success(
                "Password changed, but we couldn't automatically renew your session. Please log in again.", data={}
            )

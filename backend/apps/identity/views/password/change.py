# users/views/password/change.py
import logging
from rest_framework import permissions
from rest_framework.views import APIView

from users.authentication import SafeJWTAuthentication
from users.serializers.password_serializers import ChangePasswordSerializer
from users.services.password_service import change_user_password, check_password_reuse, validate_password_strength
from users.services.token_service import rotate_tokens_secure
from users.utils.request_utils import get_client_ip
from users.utils.response_utils import password_error, password_success
from users.utils.general_utils import serialize_user
from users.utils.cookie_utils import set_refresh_cookie

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
        old_refresh = request.COOKIES.get("refresh_token")

        # Rotate tokens if refresh cookie exists
        try:
            if old_refresh:
                rotated = rotate_tokens_secure(user=user, old_refresh=old_refresh, ip=ip, user_agent=user_agent)
                new_refresh, new_access = rotated["refresh"], rotated["access"]

                resp = password_success(
                    "Password updated successfully.",
                    data={"access": new_access, "user": serialize_user(user)}
                )
                # Set refresh cookie via helper
                set_refresh_cookie(resp, str(new_refresh))

                # Clear first_time_login / need_password_reset flags
                if getattr(user, "need_password_reset", False) or getattr(user, "first_time_login", False):
                    user.need_password_reset = False
                    user.first_time_login = False
                    user.save(update_fields=["need_password_reset", "first_time_login"])

                logger.info(f"✅ Password changed and tokens rotated for user {user.id} from IP {ip}")
                return resp

            # If no refresh cookie, frontend needs to re-login
            logger.info(f"Password changed but no refresh cookie present for user {user.id}")
            return password_success(
                "Password changed. Please log in again to refresh your session.", data={}
            )

        except Exception as e:
            logger.exception(f"Password change token rotation failed for user {user.id}: {e}")
            return password_success(
                "Password changed, but we couldn't refresh your session. Please log in again.", data={}
            )

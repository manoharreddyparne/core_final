# users/views/password/confirm.py
import logging
from django.db import transaction
from rest_framework import permissions
from rest_framework.views import APIView

from apps.identity.models import PasswordResetRequest
from apps.identity.serializers.password_serializers import ResetPasswordConfirmSerializer
from apps.identity.services.password_service import change_user_password, check_password_reuse, validate_password_strength
from apps.identity.services.token_service import logout_all_sessions_secure
from apps.identity.utils.response_utils import password_error, password_success
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.email_utils import send_password_changed_email
from apps.identity.utils.general_utils import serialize_user
from apps.identity.utils.cookie_utils import REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH

logger = logging.getLogger(__name__)


class ResetPasswordConfirmView(APIView):
    """
    Confirm password reset using token from email.
    - Changes password
    - Invalidates all sessions for the user
    - Marks reset-request used
    - DOES NOT auto-login the user; frontend should redirect to login
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, token=None):
        serializer = ResetPasswordConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.user
        reset_request: PasswordResetRequest = serializer.reset_request
        new_password = serializer.validated_data["new_password"]

        ip = get_client_ip(request) or "unknown"
        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")

        try:
            with transaction.atomic():
                # Check password reuse & strength
                if check_password_reuse(user, new_password):
                    return password_error("This password was used recently. Try a different one.")

                valid, msg = validate_password_strength(new_password)
                if not valid:
                    return password_error(msg)

                # Update password
                change_user_password(user, new_password)

                # Invalidate all sessions for the user
                logout_all_sessions_secure(user)

                # Mark reset request as used
                reset_request.used = True
                reset_request.save(update_fields=["used"])

                # Notify user via email (best-effort)
                try:
                    send_password_changed_email(user)
                except Exception:
                    logger.warning(f"Failed to send password changed email for user {user.id}")

        except Exception as e:
            logger.exception(f"Reset password confirm failed: {e}")
            return password_error("Password reset failed. Please try again later.")

        # Prepare response
        resp = password_success(
            "Password successfully reset! Please login with your new credentials.",
            data={
                "user": serialize_user(user),
                "reset_success": True
            }
        )

        # Clear server-side refresh cookies
        resp.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH, domain=None)
        resp.delete_cookie("refresh_token_present", path=REFRESH_COOKIE_PATH, domain=None)

        logger.info(f"✅ Password reset confirmed for user {user.id} from IP {ip}")
        return resp

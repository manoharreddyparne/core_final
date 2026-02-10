# users/views/password/validate.py
"""
Password reset token validation endpoint.
Uses centralized helpers for suspicious attempt logging and token normalization.
"""

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions
from rest_framework.views import APIView

from apps.identity.models import PasswordResetRequest
from apps.identity.utils.response_utils import password_error, password_success
from apps.identity.utils.security import hash_token, normalize_token_value
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.views.password.helpers import record_password_suspicious_attempt as record_suspicious_attempt

logger = logging.getLogger(__name__)


class ResetPasswordValidateView(APIView):
    """
    Public endpoint to validate a password reset token.
    Returns user info if token is valid, otherwise returns error.
    """
    permission_classes = [permissions.AllowAny]

    TOKEN_EXPIRATION_MINUTES = 30

    def get(self, request, token=None):
        ip = get_client_ip(request) or "unknown"
        token_value = str(token or request.query_params.get("token", "")).strip()

        if not token_value:
            record_suspicious_attempt(ip=ip, reason="empty_token_validate")
            return password_error("Reset link validation failed. Missing token.", errors={"ip": ip})

        normalized = normalize_token_value(token_value)
        if len(normalized) < 10:
            record_suspicious_attempt(ip=ip, token=normalized, reason="invalid_token_format")
            return password_error("Invalid token format.", errors={"ip": ip, "token": normalized[:32]})

        hashed_token = hash_token(normalized)
        reset_request = (
            PasswordResetRequest.objects.filter(token_hash=hashed_token, used=False)
            .select_related("user")
            .first()
        )

        if not reset_request:
            record_suspicious_attempt(ip=ip, token=normalized, reason="invalid_token_validate")
            return password_error("Invalid or expired reset link.", errors={"ip": ip, "token": normalized[:32]})

        # Check token expiration
        if reset_request.created_at + timedelta(minutes=self.TOKEN_EXPIRATION_MINUTES) < timezone.now().astimezone(reset_request.created_at.tzinfo):
            return password_error("This reset link has expired.", errors={"ip": ip, "token": normalized[:32]})

        user = reset_request.user
        logger.info(f"✅ Password reset token validated for user {user.id} from IP {ip}")

        return password_success(
            "Reset link validated successfully.",
            data={
                "email": user.email,
                "user_id": user.id,
                "ip": ip,
            }
        )

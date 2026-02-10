# users/views/password/request.py
import logging
from django.utils import timezone
from django.core.cache import cache
from django.db import transaction
from django.conf import settings
from rest_framework import permissions
from rest_framework.views import APIView

from users.models import User, PasswordResetRequest
from users.serializers.password_serializers import ResetPasswordRequestSerializer
from users.utils.request_utils import get_client_ip
from users.utils.response_utils import password_error, password_success
from users.utils.email_utils import send_password_reset_email
from users.views.password.helpers import record_password_suspicious_attempt as record_suspicious_attempt

logger = logging.getLogger(__name__)

# ---------------- CONFIG ----------------
RESET_COOLDOWN_MINUTES = 5
MAX_FAILED_ATTEMPTS = 5
BLOCK_DURATION_MINUTES = 20


class ResetPasswordRequestView(APIView):
    """
    Public endpoint to request a reset link. Handles rate-limiting and anti-abuse.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordRequestSerializer(data=request.data)
        is_valid = serializer.is_valid(raise_exception=False)

        ip = get_client_ip(request) or "unknown"
        now_ts = timezone.now().timestamp()

        # ---------------- CHECK IP BLOCK ----------------
        block_key = f"reset_block:{ip}"
        blocked = cache.get(block_key)
        if blocked and now_ts < int(blocked.get("locked_until", 0)):
            cooldown = int(blocked["locked_until"] - now_ts)
            return password_error(
                f"Too many failed attempts. IP {ip} blocked.",
                errors={"ip": ip, "locked_until": int(blocked["locked_until"]), "cooldown": cooldown},
            )

        attempts_key = f"reset_attempts:{ip}"
        fail_count = cache.get(attempts_key, 0)

        # ---------------- SERIALIZER VALIDATION ----------------
        if not is_valid:
            fail_count += 1
            cache.set(attempts_key, fail_count, timeout=BLOCK_DURATION_MINUTES * 60)

            if fail_count >= MAX_FAILED_ATTEMPTS:
                locked_until = int(now_ts + BLOCK_DURATION_MINUTES * 60)
                cache.set(block_key, {"attempts": fail_count, "locked_until": locked_until}, timeout=BLOCK_DURATION_MINUTES * 60)
                cache.delete(attempts_key)
                record_suspicious_attempt(ip=ip, reason="validation_fail_limit_reached")
                return password_error(
                    f"Too many failed attempts. IP {ip} blocked for {BLOCK_DURATION_MINUTES} mins.",
                    errors={"ip": ip, "locked_until": locked_until, "cooldown": BLOCK_DURATION_MINUTES * 60},
                )

            msg = serializer.errors.get("email", ["Validation failed."])[0]
            return password_error(msg, errors={"ip": ip, "cooldown": 0})

        # ---------------- EMAIL LOOKUP ----------------
        email = serializer.validated_data.get("email", "").lower()
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            fail_count += 1
            cache.set(attempts_key, fail_count, timeout=BLOCK_DURATION_MINUTES * 60)
            if fail_count >= MAX_FAILED_ATTEMPTS:
                locked_until = int(now_ts + BLOCK_DURATION_MINUTES * 60)
                cache.set(block_key, {"attempts": fail_count, "locked_until": locked_until}, timeout=BLOCK_DURATION_MINUTES * 60)
                cache.delete(attempts_key)
                record_suspicious_attempt(ip=ip, email=email, reason="invalid_email_limit_reached")
                return password_error(
                    f"Too many failed attempts. IP {ip} blocked for {BLOCK_DURATION_MINUTES} mins.",
                    errors={"ip": ip, "locked_until": locked_until, "cooldown": BLOCK_DURATION_MINUTES * 60},
                )
            return password_error("Please enter a valid registered email.", errors={"ip": ip, "cooldown": 0})

        # ---------------- RATE LIMIT PER EMAIL+IP ----------------
        cache_key = f"reset_request:{email}:{ip}"
        last_ts = cache.get(cache_key)
        if last_ts:
            remaining = int(RESET_COOLDOWN_MINUTES * 60 - (now_ts - float(last_ts)))
            if remaining > 0:
                return password_error(
                    f"Please wait {remaining} seconds before another reset.",
                    errors={"ip": ip, "cooldown": remaining}
                )

        # ---------------- CREATE RESET REQUEST & SEND EMAIL ----------------
        cache.set(cache_key, now_ts, timeout=RESET_COOLDOWN_MINUTES * 60)
        PasswordResetRequest.objects.filter(user=user, used=False).delete()

        try:
            with transaction.atomic():
                reset_request, raw_token = PasswordResetRequest.create_reset_request(user)
                success, detail = send_password_reset_email(reset_request, raw_token)
                if not success:
                    raise Exception(detail)
        except Exception as e:
            logger.exception(f"Password reset request failed for user={user.id}: {e}")
            record_suspicious_attempt(ip=ip, email=email, reason="reset_request_failure")
            return password_error("Unable to send reset email.", errors={"ip": ip, "cooldown": 0})

        # ---------------- SUCCESS RESPONSE ----------------
        cache.delete(attempts_key)
        logger.info(f"✅ Password reset requested for user {user.id} from IP {ip}")
        return password_success(
            f"A password reset link has been sent to {email}.",
            data={"ip": ip, "dev_token": raw_token if settings.DEBUG else None},
        )

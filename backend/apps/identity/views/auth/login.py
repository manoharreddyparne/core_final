import requests
import logging
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.cache import cache
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from django.db.models import Q

from apps.identity.models import User
from apps.identity.services.auth_service import handle_login
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.cookie_utils import set_refresh_cookie

logger = logging.getLogger(__name__)

# Throttling / cooldown (student login)
MAX_FAILED_ATTEMPTS = 5        # total attempts allowed
LOCKOUT_MINUTES = 5            # after max failures
LOGIN_COOLDOWN_SECONDS = 5     # short cooldown after each fail/success burst


def make_login_cache_keys(login_input: str, ip: str):
    login_input = (login_input or "").lower()
    return (
        f"login_attempts:{login_input}:{ip}",
        f"login_cooldown:{login_input}:{ip}",
    )


def handle_login_exception(e, attempts_key, cooldown_key, login_input, ip):
    import logging
    _log = logging.getLogger(__name__)

    # Simple counter — do not overcomplicate with decryption unless specifically required
    # If the cache has "corrupted" or old encrypted data, we reset to 1
    raw_val = cache.get(attempts_key, 0)
    try:
        if isinstance(raw_val, (int, float)):
            failed_attempts = int(raw_val) + 1
        else:
            # It's a string, likely old encrypted data or something else
            # reset to avoid crash
            failed_attempts = 1
    except Exception:
        failed_attempts = 1

    cache.set(attempts_key, failed_attempts, LOCKOUT_MINUTES * 60)
    cache.set(cooldown_key, True, LOGIN_COOLDOWN_SECONDS)

    _log.warning(
        f"[LOGIN] Failed | user={login_input} ip={ip} reason={getattr(e,'detail',str(e))}"
    )
    return error_response("Invalid credentials", status_code=401)


class CustomTokenObtainPairView(APIView):
    """
    ✅ STUDENT LOGIN FLOW
    POST: { identifier, password }
    → issues access + refresh via HttpOnly cookie
    → returns user + access (normalized with admin flow)
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def verify_turnstile(self, token):
        if not settings.TURNSTILE_ENABLED:
            return True
        if not token:
            return False
        
        try:
            response = requests.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": settings.TURNSTILE_SECRET_KEY,
                    "response": token,
                },
                timeout=5
            )
            return response.json().get("success", False)
        except Exception as e:
            logger.error(f"[TURNSTILE] Validation error: {e}")
            return False

    def post(self, request, *args, **kwargs):
        identifier = request.data.get("identifier") or request.data.get("username")
        password = request.data.get("password") or ""
        turnstile_token = request.data.get("turnstile_token")
        ip = get_client_ip(request)

        if not identifier or not password:
            return error_response("identifier + password required", status_code=400)

        # ✅ Human Verification (Cloudflare Turnstile)
        if not self.verify_turnstile(turnstile_token):
            return error_response("Human verification failed. Please try again.", status_code=403)

        attempts_key, cooldown_key = make_login_cache_keys(identifier, ip)
        failed_attempts = cache.get(attempts_key, 0)

        # too many total fails → long lock
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            return error_response("Too many attempts. Try later.", status_code=429)

        # short cooldown
        if cache.get(cooldown_key):
            return error_response("Try again in a few seconds.", status_code=429)

        # find user (no enumeration on failure)
        user = User.objects.filter(
            Q(username__iexact=identifier) | Q(email__iexact=identifier)
        ).first()

        if not user:
            failed_attempts += 1
            cache.set(attempts_key, failed_attempts, LOCKOUT_MINUTES * 60)
            cache.set(cooldown_key, True, LOGIN_COOLDOWN_SECONDS)
            return error_response("Invalid credentials", status_code=401)

        # ❌ wrong role → early block; DO NOT password-test; DO NOT cooldown bump
        if getattr(user, "role", None) != User.Roles.STUDENT:
            return error_response("User not allowed to login as student", status_code=403)

        # ✅ valid STUDENT → authenticate
        try:
            tokens = handle_login(
                user,
                password=password,
                ip=ip,
                user_agent=request.META.get("HTTP_USER_AGENT", "unknown"),
                request=request,
                role_context="student",   # forces Student serializer
            )
        except Exception as e:
            # wrong password, etc
            return handle_login_exception(e, attempts_key, cooldown_key, identifier, ip)

        # ✅ success — clear failure counter; brief cooldown to smooth spam
        cache.delete(attempts_key)
        cache.set(cooldown_key, True, LOGIN_COOLDOWN_SECONDS)

        payload = {
            "access": tokens.get("access"),
            "refresh_token_present": True,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": getattr(user, "role", None),
            },
        }

        resp = success_response("Login OK", data=payload)
        set_refresh_cookie(resp, tokens.get("refresh"))
        logger.info(f"[LOGIN] ✅ user={user.id} ip={ip}")
        return resp

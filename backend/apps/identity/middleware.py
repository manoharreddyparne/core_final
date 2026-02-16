# users/middleware.py

import logging
from django.utils.functional import SimpleLazyObject
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.models import LoginSession
from apps.identity.services.token_service import send_session_ws_event

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
        from apps.identity.services.security_service import is_ip_blocked
        from apps.identity.utils.request_utils import get_client_ip
        
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            logger.warning(f"Blocked request from neutralized IP: {ip}")
            return AnonymousUser()

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
        from apps.identity.services.quantum_shield import QuantumShieldService
        
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        token_str = None
        
        if auth_header.startswith("Bearer "):
            token_str = auth_header.split()[1].strip()
        
        # If no header, try to reconstruct from Quantum Shield (Split Cookies)
        if not token_str:
            shield_token, _ = QuantumShieldService.reconstruct_token(request.COOKIES)
            if shield_token:
                try:
                    from rest_framework_simplejwt.tokens import RefreshToken
                    rt = RefreshToken(shield_token)
                    token_str = str(rt.access_token)
                except Exception:
                    pass

        if not token_str:
            return None

        auth = SafeJWTAuthentication()
        try:
            result = auth.authenticate(request) # This will now check the reconstructed access
            if result is None:
                return None
            user, validated_token = result
            jti = validated_token.get("jti")
            
            if jti:
                # Update last_active for active session
                LoginSession.objects.filter(user=user, jti=jti, is_active=True).update(last_active=timezone.now())

            return user
        except Exception as e:
            logger.debug(f"Auth middleware bypass: {e}")
            return None

class SilentRotationMiddleware:
    """
    ✅ Silent Token Rotation (RAM-based Access Tokens)
    
    1. Detects near-expiry access tokens in Authorization header.
    2. If < 15s remaining, silently rotates via refresh cookie.
    3. Attaches new tokens to Response (Cookie + X-New-Access-Token header).
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only rotate on successful responses to avoid redundant logic on errors
        if response.status_code >= 400:
            return response

        from apps.identity.services.quantum_shield import QuantumShieldService
        refresh_token_str, _ = QuantumShieldService.reconstruct_token(request.COOKIES)
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not refresh_token_str or not auth_header.startswith("Bearer "):
            return response

        try:
            from rest_framework_simplejwt.tokens import UntypedToken
            from apps.identity.services.token_service import rotate_tokens_secure
            from apps.identity.models import User
            from apps.identity.utils.request_utils import get_client_ip
            from datetime import datetime, timezone as dt_timezone

            access_token_str = auth_header.split()[1]
            token = UntypedToken(access_token_str)
            exp = token.get("exp")

            if exp:
                now = datetime.now(tz=dt_timezone.utc).timestamp()
                remaining = exp - now

                # Threshold: 15 seconds remaining
                if remaining < 15:
                    user_id = token.get("user_id")
                    user = User.objects.filter(id=user_id).first()
                    if user:
                        ip = get_client_ip(request)
                        ua = request.META.get("HTTP_USER_AGENT", "unknown")
                        
                        logger.info(f"[SILENT-ROTATE] Near expiry ({int(remaining)}s). Rotating for {user.email}")
                        
                        # Service handles rotation logic (new session, blacklist old)
                        data = rotate_tokens_secure(user, refresh_token_str, ip, ua)
                        
                        # Attach new Quantum Shield segments
                        from apps.identity.utils.cookie_utils import set_quantum_shield
                        set_quantum_shield(response, data.get("fragments", {}))
                        
                        response["X-New-Access-Token"] = data["access"]
                        response["Access-Control-Expose-Headers"] = "X-New-Access-Token"
        except Exception as e:
            # Silent failure - session bootstrap will handle 401 if needed
            logger.debug(f"[SILENT-ROTATE] Skip/Fail: {e}")

        return response

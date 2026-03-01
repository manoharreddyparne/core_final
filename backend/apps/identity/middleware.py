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

class CertificateValidityMiddleware:
    """
    🏢 Institutional Certificate Enforcement Middleware
    
    Verifies that the current tenant's X.509 certificate is valid and not expired.
    If expired, it blocks all non-public access to the tenant.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django_tenants.utils import get_tenant
        from apps.identity.models.institution import Institution
        from django.http import JsonResponse
        from django.utils import timezone
        
        tenant = get_tenant(request)
        
        # Public schema doesn't need certificate check
        if not tenant or tenant.schema_name == 'public':
            return self.get_response(request)

        # Bypass paths that might be needed for renewal or public info
        BYPASS_PATHS = ('/api/public/', '/api/auth/v2/login/')
        if any(request.path.startswith(p) for p in BYPASS_PATHS):
            return self.get_response(request)

        # Retrieve the institution record from public schema
        from django_tenants.utils import schema_context
        with schema_context('public'):
            institution = Institution.objects.filter(schema_name=tenant.schema_name).first()
            
            if institution:
                # 1. Check if certificate exists
                if not institution.certificate_expires_at:
                    # If it's an old institution without a cert, we might want to allow 
                    # for now or block. Let's block for maximum security.
                    return JsonResponse({
                        "error": "Access Revoked",
                        "detail": "No valid digital certificate found for this node. Contact AUIP Governance.",
                        "code": "CERTIFICATE_MISSING"
                    }, status=403)

                # 2. Check Expiration
                if institution.certificate_expires_at < timezone.now():
                    logger.warning(f"[PKI-ENFORCEMENT] Access REVOKED for {institution.name} due to certificate expiry: {institution.certificate_expires_at}")
                    return JsonResponse({
                        "error": "Subscription Expired",
                        "detail": f"Access to this portal has been revoked because the security certificate expired on {institution.certificate_expires_at.strftime('%Y-%m-%d')}. Renewal is required.",
                        "code": "CERTIFICATE_EXPIRED",
                        "expires_at": institution.certificate_expires_at.isoformat()
                    }, status=403)

        return self.get_response(request)


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

    # Paths that must use Django's default session auth (not JWT)
    BYPASS_PATHS = ('/admin/',)

    def __call__(self, request):
        # Skip JWT auth for Django admin — it uses session-based auth
        if any(request.path.startswith(p) for p in self.BYPASS_PATHS):
            return self.get_response(request)

        # We need to load the user (and auth) once per request
        # SimpleLazyObject only caches the callable result
        def get_auth_context():
            user = self._get_user_safe(request)
            return user

        request.user = SimpleLazyObject(get_auth_context)
        return self.get_response(request)

    def _get_user_safe(self, request):
        from apps.identity.services.security_service import is_ip_blocked
        from apps.identity.utils.request_utils import get_client_ip
        
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            logger.warning(f"Blocked request from neutralized IP: {ip}")
            return AnonymousUser()

        try:
            result = self.get_user(request)
            if result:
                user, token = result
                request.auth = token
                return user
            return AnonymousUser()
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
                # Update last_active for active session (Tenant-Aware)
                from django_tenants.utils import schema_context
                schema = validated_token.get('schema', '')
                tenant_user_id = validated_token.get('tenant_user_id')
                
                with schema_context('public'):
                    if schema and tenant_user_id:
                        LoginSession.objects.filter(
                            tenant_user_id=tenant_user_id, 
                            tenant_schema=schema, 
                            jti=jti, 
                            is_active=True
                        ).update(last_active=timezone.now())
                    else:
                        # Global user session
                        if hasattr(user, 'id'):
                            LoginSession.objects.filter(
                                user=user, 
                                jti=jti, 
                                is_active=True
                            ).update(last_active=timezone.now())

            return user, validated_token
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

    BYPASS_PATHS = ('/admin/',)

    def __call__(self, request):
        # Skip silent rotation for Django admin endpoints
        if any(request.path.startswith(p) for p in self.BYPASS_PATHS):
            return self.get_response(request)

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
                    schema = token.get("schema")
                    role = token.get("role")
                    
                    user = None
                    # Resolve identity based on context (Global vs Tenant)
                    if schema:
                        from django_tenants.utils import schema_context
                        with schema_context(schema):
                            from apps.auip_institution.models import AdminAuthorizedAccount, FacultyAuthorizedAccount, StudentAuthorizedAccount
                            models = {
                                'STUDENT': StudentAuthorizedAccount,
                                'FACULTY': FacultyAuthorizedAccount,
                                'INSTITUTION_ADMIN': AdminAuthorizedAccount,
                            }
                            model = models.get(role)
                            if model:
                                try:
                                    user = model.objects.get(id=user_id)
                                except model.DoesNotExist:
                                    pass
                    else:
                        user = User.objects.filter(id=user_id).first()

                    if user:
                        ip = get_client_ip(request)
                        ua = request.META.get("HTTP_USER_AGENT", "unknown")
                        
                        logger.info(f"[SILENT-ROTATE] Near expiry ({int(remaining)}s). Rotating for {getattr(user, 'email', 'unknown')} | Context={schema or 'global'}")
                        
                        # Service handles rotation logic (new session, blacklist old)
                        data = rotate_tokens_secure(user, refresh_token_str, ip, ua, schema=schema)
                        
                        # Attach new Quantum Shield segments
                        from apps.identity.utils.cookie_utils import set_quantum_shield
                        set_quantum_shield(response, data.get("fragments", {}))
                        
                        response["X-New-Access-Token"] = data["access"]
                        response["Access-Control-Expose-Headers"] = "X-New-Access-Token"
        except Exception as e:
            # Silent failure - session bootstrap will handle 401 if needed
            logger.debug(f"[SILENT-ROTATE] Skip/Fail: {e}")

        return response

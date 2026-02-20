import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from django.conf import settings
from apps.identity.services.token_service import authenticate_access_token
from apps.identity.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


class SafeJWTAuthentication(JWTAuthentication):
    """
    ✅ Validates access token against:
       • JWT signature + expiry
       • DB session whitelist
       • Device fingerprint
    ✅ Attaches:
       • request.user
       • request.access_jti
    """

    def authenticate(self, request):
        """
        Extract access token → validate → enforce session + fingerprint
        """
        # 1. Basic JWT Extraction & Signature Check
        header = self.get_header(request)
        if header is None:
            return None
        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None
            
        validated_token = self.get_validated_token(raw_token)
        
        # 2. Resolve User (Isolated or Global)
        user = self.get_user(validated_token)
        
        # 3. Security Heartbeat (Session Validation)
        # We perform session validation directly here to handle both Global and Tenant identities
        jti = validated_token.get("jti")
        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT") or "unknown"
        
        from apps.identity.models.auth_models import LoginSession
        from apps.identity.services.token_service import verify_session_fingerprint
        from django_tenants.utils import schema_context
        
        # ✅ CRITICAL: Session lookup MUST happen in public schema
        with schema_context('public'):
            from django.db.models import Q
            from django.utils import timezone
            
            # 🔄 Allow graceful rotation: check both current AND previous JTI
            session = LoginSession.objects.filter(
                Q(jti=jti) | Q(previous_jti=jti),
                is_active=True
            ).first()

            if not session:
                logger.warning(f"[AUTH] Session not found or inactive for JTI {jti}")
                raise AuthenticationFailed("Invalid or expired access token", code="token_not_valid")
            
            # If matching by previous_jti, verify within 60s grace period
            if session.jti != jti and session.previous_jti == jti:
                grace_seconds = 60
                if not session.rotated_at or (timezone.now() - session.rotated_at).total_seconds() > grace_seconds:
                    logger.warning(f"[AUTH] Previous JTI used AFTER grace period: {jti}")
                    raise AuthenticationFailed("Access token has been rotated and grace period expired.", code="token_not_valid")
                logger.debug(f"[AUTH] 🔄 Allowing previous JTI within grace period: {jti}")
            
            # Verify identity binding
            # Check if this session belongs to the user we resolved
            # Flexible Identity Verification: Use type-safe string comparisons
            global_token_id = validated_token.get(settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id'))
            tenant_token_id = validated_token.get('tenant_user_id')
            
            identity_match = False
            if session.user_id and global_token_id:
                if str(session.user_id) == str(global_token_id):
                    identity_match = True
            
            if not identity_match and session.tenant_user_id and tenant_token_id:
                if str(session.tenant_user_id) == str(tenant_token_id):
                    identity_match = True
            
            if not identity_match:
                logger.warning(
                    f"[AUTH] Session/Token identity mismatch for JTI {jti}. "
                    f"Session(u={session.user_id}, t={session.tenant_user_id}) vs "
                    f"Token(u={global_token_id}, t={tenant_token_id})"
                )
                raise AuthenticationFailed("Access token identity mismatch", code="token_not_valid")

            # 4. Fingerprint Proof
            try:
                verify_session_fingerprint(session, ip, user_agent)
            except Exception as e:
                logger.warning(f"[AUTH] Fingerprint mismatch for JTI {jti}: {e}")
                raise AuthenticationFailed("Device fingerprint mismatch", code="token_not_valid")

        # ✅ Success: Attach JTI to request
        request.access_jti = jti

        return user, validated_token

    def get_user(self, validated_token):
        """
        Custom User Retrieval:
        - If 'schema' claim exists, switch context and find AuthorizedAccount.
        - Otherwise, find global User.
        """
        from apps.identity.models.core_models import User
        from django_tenants.utils import schema_context
        
        user_id = validated_token.get(settings.SIMPLE_JWT['USER_ID_CLAIM'])
        tenant_user_id = validated_token.get('tenant_user_id')
        schema = validated_token.get('schema')
        role = validated_token.get('role')

        # ✅ Case 1: Tenant Isolated User (Student/Faculty/Admins within schema)
        if schema:
            with schema_context(schema):
                from apps.auip_institution.models import StudentAuthorizedAccount, FacultyAuthorizedAccount, AdminAuthorizedAccount
                
                # Determine which localized model to use
                if role == 'STUDENT':
                    model = StudentAuthorizedAccount
                elif role == 'FACULTY':
                    model = FacultyAuthorizedAccount
                else:
                    model = AdminAuthorizedAccount
                
                # Use tenant-specific ID if available (v2 fix), fallback to user_id
                lookup_id = tenant_user_id if tenant_user_id else user_id
                
                try:
                    return model.objects.get(id=lookup_id)
                except model.DoesNotExist:
                    # If not found in isolated schema, fallback to global lookup (e.g. for InstAdmins)
                    pass
        
        # ✅ Case 2: Standard Global User (SuperAdmin, Admin, etc.)
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise AuthenticationFailed("User identity not found", code="user_not_found")

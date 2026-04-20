from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions
from django.db import connection
from django_tenants.utils import schema_context
from apps.auip_tenant.models import Client
from apps.identity.models.institution import Institution
from apps.identity.models import User # Added this
import logging

logger = logging.getLogger(__name__)

class TenantAuthentication(JWTAuthentication):
    """
    Custom Authentication for Institutional Admins.
    Uses 'schema' claim in JWT to switch tenant context.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            return None

        # Check for Tenant Context
        schema_name = validated_token.get('schema')
        if not schema_name or schema_name == 'public':
            # Not a tenant token or is a global token, let other auth classes handle it
            return None
        user_id = validated_token['user_id']
        role = validated_token.get('role')
        jti = validated_token.get('jti')

        # ✅ Session Validation MUST run in public schema (LoginSession is public)
        from apps.identity.models import LoginSession
        from django.db.models import Q
        from django.utils import timezone
        
        with schema_context('public'):
            session = LoginSession.objects.filter(
                Q(jti=jti) | Q(previous_jti=jti),
                is_active=True
            ).first()

        if not session:
            # Check if it was because it's inactive or totally missing
            with schema_context('public'):
                exists = LoginSession.objects.filter(Q(jti=jti) | Q(previous_jti=jti)).exists()
            
            logger.warning(
                f"[TenantAuth] Session validation FAILED for JTI={jti}. "
                f"Exists in DB? {exists} | user_id={user_id} | schema={schema_name}"
            )
            raise exceptions.AuthenticationFailed('Session revoked or expired', code='token_not_valid')

        # 🔄 Allow graceful rotation: check if previous JTI is still within grace period
        if session.jti != jti and session.previous_jti == jti:
            grace_seconds = 60
            if not session.rotated_at or (timezone.now() - session.rotated_at).total_seconds() > grace_seconds:
                logger.warning(f"[TenantAuth] Previous JTI used AFTER grace period: {jti}")
                raise exceptions.AuthenticationFailed('Access token has been rotated and grace period expired.', code='token_not_valid')
            logger.debug(f"[TenantAuth] Allowing previous JTI within grace period: {jti}")

        # ✅ Identity Verification: Match token and session
        # session.user matches the 'user_id' claim (Global ID)
        # session.tenant_user_id matches the 'tenant_user_id' claim (Localized ID)
        tenant_token_id = validated_token.get('tenant_user_id')
        identity_match = False
        
        if session.user_id and str(session.user_id) == str(user_id):
            identity_match = True
        
        if not identity_match and session.tenant_user_id and tenant_token_id:
            if str(session.tenant_user_id) == str(tenant_token_id):
                identity_match = True
        
        if not identity_match:
            logger.warning(
                f"[TenantAuth] Identity mismatch! Session(u={session.user_id}, t={session.tenant_user_id}) "
                f"vs Token(u={user_id}, t={tenant_token_id}) | JTI={jti}"
            )
            # We raise the same error for security obfuscation but log the detail
            raise exceptions.AuthenticationFailed('Session revoked or expired', code='token_not_valid')

        # 1. Switch Schema Globally for this Request
        # This ensures all subsequent queries (Permissions, Views) run in tenant context
        previous_schema = connection.schema_name
        if previous_schema != schema_name:
            connection.set_schema(schema_name)
            logger.debug(f"[TenantAuth] Switched from {previous_schema} to {schema_name}")

        # 2. Retrieve Account based on Role (inside tenant schema)
        from apps.auip_institution.models import (
            AdminAuthorizedAccount, 
            FacultyAuthorizedAccount, 
            StudentAuthorizedAccount
        )

        if role in ("INSTITUTION_ADMIN", "INST_ADMIN"):
            acc_model = AdminAuthorizedAccount
        elif role == "FACULTY":
            acc_model = FacultyAuthorizedAccount
        elif role == "STUDENT":
            acc_model = StudentAuthorizedAccount
        else:
            # Fallback or strict error
            acc_model = StudentAuthorizedAccount

        try:
            # ✅ IMPROVEMENT: Prioritize tenant_user_id if available, fallback to user_id
            target_id = validated_token.get('tenant_user_id', user_id)
            user = acc_model.objects.get(id=target_id)
        except acc_model.DoesNotExist:
            # ✅ Case 2: Standard Global User (SuperAdmin, Admin, etc.)
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                # Last resort: Try looking in public schema explicitly
                with schema_context('public'):
                    try:
                        user = User.objects.get(id=user_id)
                    except User.DoesNotExist:
                        raise exceptions.AuthenticationFailed("User identity not found", code="user_not_found")

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User is inactive', code='user_inactive')

        # 3. Attach Public Institution Object (MUST query public schema)
        # Used for filtering CoreStudent (Shared Model)
        try:
            with schema_context('public'):
                institution = Institution.objects.get(schema_name=schema_name)
                # Link the Client (Tenant) object to request.tenant for django-tenants compatibility
                client = Client.objects.get(schema_name=schema_name)
                request.tenant = client
            user.institution = institution
        except (Institution.DoesNotExist, Client.DoesNotExist):
            raise exceptions.AuthenticationFailed('Institution configuration error', code='conf_error')

        return (user, validated_token)

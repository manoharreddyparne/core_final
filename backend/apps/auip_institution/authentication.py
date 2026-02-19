from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import exceptions
from django.db import connection
from django_tenants.utils import schema_context
from apps.identity.models.institution import Institution
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
        if 'schema' not in validated_token:
            # Not a tenant token, let other auth classes handle it
            return None

        schema_name = validated_token['schema']
        user_id = validated_token['user_id']
        role = validated_token.get('role')
        jti = validated_token.get('jti')

        # ✅ Session Validation MUST run in public schema (LoginSession is public)
        from apps.identity.models import LoginSession
        with schema_context('public'):
            session_valid = LoginSession.objects.filter(jti=jti, is_active=True).exists()

        if not session_valid:
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

        acc_model = StudentAuthorizedAccount  # Default
        if role == "INSTITUTION_ADMIN":
            acc_model = AdminAuthorizedAccount
        elif role == "FACULTY":
            acc_model = FacultyAuthorizedAccount

        try:
            # ✅ IMPROVEMENT: Prioritize tenant_user_id if available, fallback to user_id
            target_id = validated_token.get('tenant_user_id', user_id)
            user = acc_model.objects.get(id=target_id)
        except acc_model.DoesNotExist:
            raise exceptions.AuthenticationFailed('User not found in tenant schema', code='user_not_found')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('User is inactive', code='user_inactive')

        # 3. Attach Public Institution Object (MUST query public schema)
        # Used for filtering CoreStudent (Shared Model)
        try:
            with schema_context('public'):
                institution = Institution.objects.get(schema_name=schema_name)
            user.institution = institution
        except Institution.DoesNotExist:
            raise exceptions.AuthenticationFailed('Institution configuration error', code='conf_error')

        return (user, validated_token)

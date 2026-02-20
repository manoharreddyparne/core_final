"""
Institutional Admin Activation View.

Handles the activation flow for Institutional Admins:
- Validates signed activation token
- Sets password on the User account
- Marks PreSeededRegistry as active in tenant schema
- Auto-logs in (no OTP for first login — identity proven via activation link)
- Auto-trusts the device (first device = trusted)
"""

import logging
from datetime import datetime, timezone as dt_timezone

from rest_framework.views import APIView
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models.core_models import User
from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.identity.utils.activation import verify_activation_token
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.device_utils import get_device_hash
from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
from apps.identity.services.auth_service import handle_login
from apps.identity.models.auth_models import RememberedDevice
from apps.auip_tenant.models import Client
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)

# 7 days in seconds
INST_ADMIN_ACTIVATION_MAX_AGE = 7 * 24 * 3600


class InstAdminActivateSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, help_text="Signed activation token from email")
    password = serializers.CharField(
        min_length=8,
        required=True,
        help_text="New password (min 8 characters)"
    )


class InstAdminActivateView(APIView):
    """
    Activation endpoint for institutional admins.
    
    POST /auth/v2/inst-admin/activate/
    Body: { "token": "...", "password": "..." }
    
    Flow:
    1. Verify signed activation token (7-day expiry)
    2. Find User (role=INST_ADMIN) created during approval
    3. Set password
    4. Mark PreSeededRegistry.is_active = True in tenant schema
    5. Auto-login (no OTP — identity proven via activation link)
    6. Auto-trust this device
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """
        Public: Validate activation token before showing the form.
        Checks status against Tenant AuthorizedAccount, NOT Global User.
        """
        token = request.query_params.get("token")
        if not token:
            return error_response("Token required.", code=400)

        result = verify_activation_token(token, max_age=INST_ADMIN_ACTIVATION_MAX_AGE)
        if not result:
            return error_response("Invalid or expired activation link.", code=400)

        institution_id, identifier, role = result
        
        # Resolve Institution to check real status in Tenant Schema
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return error_response("Institution not found.", code=404)

        if not institution.schema_name:
             return error_response("Institution schema not ready.", code=400)
             
        already_activated = False
        
        try:
            with schema_context(institution.schema_name):
                from apps.auip_institution.models import AdminPreSeededRegistry, AdminAuthorizedAccount
                # ✅ V2 Robust Check:
                # 1. Try to find the AuthorizedAccount
                account = AdminAuthorizedAccount.objects.filter(email__iexact=identifier).first()
                if account:
                    if account.is_active and account.password_hash:
                        already_activated = True
                else:
                    # 2. If no account, check if they are at least in the Registry
                    registry_exists = AdminPreSeededRegistry.objects.filter(identifier__iexact=identifier).exists()
                    if not registry_exists:
                        return error_response("Identity not found in this institution's registry.", code=404)
        except Exception as e:
            logger.error(f"[InstAdmin-Activate] Error checking status: {e}")

        return success_response("Token valid.", data={
            "email": identifier,
            "role": role,
            "already_activated": already_activated,
            "institution_name": institution.name
        })

    def post(self, request):
        serializer = InstAdminActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        # 1. Verify activation token (7-day expiry)
        result = verify_activation_token(token, max_age=INST_ADMIN_ACTIVATION_MAX_AGE)
        if not result:
            logger.warning(f"[InstAdmin-Activate] Invalid or expired activation token")
            return error_response("Invalid or expired activation link.", code=400)

        institution_id, identifier, role = result
        logger.info(f"[InstAdmin-Activate] Token valid for institution_id={institution_id}, identifier={identifier}")

        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return error_response("Institution not found.", code=404)

        if not institution.schema_name:
             return error_response("Institution schema not ready.", code=400)

        # 2. Switch to Tenant Schema & Activate AuthorizedAccount
        # We DO NOT look at the global User table explicitly to avoid Super Admin leakage.
        # We go straight to the tenant's AuthorizedAccount.
        
        with schema_context(institution.schema_name):
            try:
                # ✅ V2 Robust Activation:
                # 1. Find the Registry entry (must exist from approval/seeding)
                from apps.auip_institution.models import AdminPreSeededRegistry, AdminAuthorizedAccount
                registry_entry = AdminPreSeededRegistry.objects.get(identifier__iexact=identifier)
                
                # 2. Get or Create the AuthorizedAccount
                from django.contrib.auth.hashers import make_password
                account, created = AdminAuthorizedAccount.objects.get_or_create(
                    registry_ref=registry_entry,
                    defaults={
                        "email": identifier.lower(), # Normalize email
                        "password_hash": make_password(password),
                        "is_active": True
                    }
                )
                
                # 🛡️ Block re-activation if account already active with a password
                if not created:
                    if account.is_active and account.password_hash:
                        return error_response(
                            "Account already activated. Please log in instead.",
                            code=400
                        )
                    # If exists but not fully activated, set password
                    account.password_hash = make_password(password)
                    account.is_active = True
                
                # Update metadata
                account.last_login_ip = get_client_ip(request)
                account.last_login_ua = request.META.get("HTTP_USER_AGENT", "unknown")
                account.last_login_at = datetime.now(tz=dt_timezone.utc)
                account.save()
                
                # 4. Update AdminPreSeededRegistry
                registry_entry.is_activated = True
                registry_entry.activated_at = datetime.now(tz=dt_timezone.utc)
                registry_entry.save()
                
                logger.info(f"[InstAdmin-Activate] Activated {identifier} in schema {institution.schema_name}")

                # 5. Handshake (Isolated Login)
                # ✅ V2 CRITICAL FIX: 
                # Institutional Admins must login using their GLOBAL identity (User model)
                # so that standard platform features (Profile, Sessions, etc.) work.
                # The tenant context is carried via 'custom_claims'.
                from apps.identity.models.institution import InstitutionAdmin
                inst_admin_link = InstitutionAdmin.objects.filter(institution=institution, user__email=identifier).first()
                if inst_admin_link:
                    identity_to_login = inst_admin_link.user
                else:
                    # Fallback to finding user by email if link is missing
                    identity_to_login = User.objects.filter(email=identifier).first() or account

                # Centralized Login Handshake (Issue fragments + fragments)
                # This ensures the Quantum Shield is set and the session is tracked.
                login_data = handle_login(
                    identity=identity_to_login,
                    password=None, # Already verified/set
                    ip=get_client_ip(request),
                    user_agent=request.META.get("HTTP_USER_AGENT", "unknown"),
                    request=request,
                    role_context="INSTITUTION_ADMIN",
                    custom_claims={
                        "schema": institution.schema_name,
                        "role": "INSTITUTION_ADMIN",
                        "email": account.email,
                        "tenant_user_id": account.id
                    }
                )

                resp = success_response(
                    "Account activated successfully.",
                    data={
                        "access": login_data["access"],
                        "refresh": login_data["refresh"],
                        "user": {
                            "id": identity_to_login.id if hasattr(identity_to_login, 'id') else account.id,
                            "email": account.email,
                            "role": "INSTITUTION_ADMIN",
                            "institution_name": institution.name
                        }
                    }
                )

                # 6. Set Quantum Shield (4-segment cookies)
                from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
                set_quantum_shield(resp, login_data["fragments"])
                set_logged_in_cookie(resp, "true", role="INSTITUTION_ADMIN")

                return resp

            except AdminAuthorizedAccount.DoesNotExist:
                 return error_response("Administrator account not found in this institution.", code=404)
            except Exception as e:
                logger.error(f"[InstAdmin-Activate] Error in {institution.schema_name}: {str(e)}")
                return error_response(f"Activation failed: {str(e)}", code=500)

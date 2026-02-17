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

from apps.identity.models.core_models import User
from apps.identity.models.institution import InstitutionAdmin
from apps.identity.utils.activation import verify_activation_token
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.request_utils import get_client_ip
from apps.identity.utils.device_utils import get_device_hash
from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
from apps.identity.services.auth_service import handle_login
from apps.identity.models.auth_models import RememberedDevice
from apps.auip_institution.models import PreSeededRegistry
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

        # 2. Find the User created during approval
        try:
            admin_user = User.objects.get(
                email=identifier,
                role=User.Roles.INSTITUTION_ADMIN,
            )
        except User.DoesNotExist:
            logger.error(f"[InstAdmin-Activate] No INST_ADMIN user found for {identifier}")
            return error_response("Administrator account not found.", code=404)

        # 3. Check if already activated
        if admin_user.has_usable_password() and not admin_user.need_password_reset:
            logger.info(f"[InstAdmin-Activate] Account already activated for {identifier}")
            return error_response("Account already activated. Please login.", code=400)

        # 4. Set password + clear reset flags
        admin_user.set_password(password)
        admin_user.need_password_reset = False
        admin_user.save(update_fields=["password", "need_password_reset"])
        logger.info(f"[InstAdmin-Activate] Password set for {identifier}")

        # 5. Mark PreSeededRegistry as active in tenant schema
        try:
            inst_admin_profile = InstitutionAdmin.objects.get(user=admin_user)
            institution = inst_admin_profile.institution
            if institution.schema_name:
                with schema_context(institution.schema_name):
                    updated_count = PreSeededRegistry.objects.filter(
                        identifier=identifier
                    ).update(is_active=True)
                    logger.info(
                        f"[InstAdmin-Activate] PreSeededRegistry.is_active=True for {identifier} "
                        f"in schema={institution.schema_name} (updated={updated_count})"
                    )
        except InstitutionAdmin.DoesNotExist:
            logger.warning(f"[InstAdmin-Activate] No InstitutionAdmin profile for {identifier}")
        except Exception as e:
            logger.error(f"[InstAdmin-Activate] Error updating PreSeededRegistry: {e}")

        # 6. Auto-login (no OTP — identity proven via signed activation link)
        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "unknown")

        try:
            token_data = handle_login(
                admin_user,
                None,  # No password check needed — we just set it
                ip,
                user_agent,
                request=request,
                role_context="admin",
            )
        except Exception as e:
            logger.error(f"[InstAdmin-Activate] Login after activation failed: {e}")
            return error_response(
                "Account activated but auto-login failed. Please login manually.",
                code=500
            )

        # 7. Auto-trust this device (first device = trusted)
        device_hash = get_device_hash(ip, user_agent)
        RememberedDevice.objects.update_or_create(
            user=admin_user,
            device_hash=device_hash,
            defaults={
                "trusted": True,
                "ip_address": ip,
                "user_agent": user_agent,
                "last_active": datetime.now(tz=dt_timezone.utc),
            }
        )
        logger.info(f"[InstAdmin-Activate] Device auto-trusted for {identifier}")

        # 8. Mark first_time_login = False
        admin_user.first_time_login = False
        admin_user.save(update_fields=["first_time_login"])

        # 9. Build response with Quantum Shield
        access = token_data.get("access")
        resp = success_response(
            "Account activated successfully.",
            data={
                "access": access,
                "refresh_token_present": True,
                "user": {
                    "id": admin_user.id,
                    "email": admin_user.email,
                    "username": admin_user.username,
                    "first_name": admin_user.first_name,
                    "last_name": admin_user.last_name,
                    "role": admin_user.role,
                },
            }
        )
        set_quantum_shield(resp, token_data.get("fragments", {}))
        set_logged_in_cookie(resp, "true")

        logger.info(f"[InstAdmin-Activate] ✅ Activation complete for {identifier}, auto-login issued")
        return resp

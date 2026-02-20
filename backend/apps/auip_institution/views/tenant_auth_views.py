
import logging
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password
from django.shortcuts import get_object_or_404

from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.request_utils import get_client_ip
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)

class InstAdminTokenObtainPairView(APIView):
    """
    Tenant-Isolated Authentication for Institutional Admins.
    Authenticates against AuthorizedAccount model in the tenant schema.
    """
    authentication_classes = []
    permission_classes = []

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        # 1. Tenant Context is already set by middleware (domain/header)
        # However, for API-based login where specific institution_id is passed,
        # we might need to manually switch schema if not on subdomain.
        
        # For this implementation, we assume the frontend sends the institution_id,
        # and we resolve the schema from it.
        
        institution_id = request.data.get("institution_id")
        email = request.data.get("email")
        password = request.data.get("password")
        turnstile_token = request.data.get("turnstile_token")

        if not (institution_id and email and password):
            return error_response("Institution ID, Email, and Password required.", code=400)

        # 🛡️ SECURITY: Global security check
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            return error_response(f"IP blocked for {lockout_time // 60} minutes.", code=403, data={"lockout_timer": lockout_time})

        # 🛡️ SECURITY: Human Verification
        from apps.identity.utils.turnstile import verify_turnstile_token
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, email)
            return error_response("Human verification failed.", code=403)

        # 2. Resolve Schema from Institution ID
        from apps.identity.models.institution import Institution
        institution = get_object_or_404(Institution, id=institution_id)

        # 3. Switch to Tenant Schema & Authenticate
        with schema_context(institution.schema_name):
            try:
                from apps.auip_institution.models import AdminAuthorizedAccount
                account = AdminAuthorizedAccount.objects.filter(email__iexact=email, is_active=True).first()
                
                if not account or not check_password(password, account.password_hash):
                    attempts_left = register_global_failure(ip, ua, email)
                    return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left})
                
                # 🛡️ ADAPTIVE 2FA: Check if device is trusted
                from apps.identity.utils.device_utils import get_device_hash
                from apps.identity.utils.trust_utils import is_device_trusted
                device_hash = get_device_hash(ip, ua)
                
                # Check global link first for device trust
                from apps.identity.models.core_models import User
                global_user = User.objects.filter(email=account.email).first()
                
                trusted = is_device_trusted(request, user=global_user, device_hash=device_hash, role="INSTITUTION_ADMIN") if global_user else False
                if not trusted:
                    # Fallback to tenant trust
                    trusted = is_device_trusted(request, tenant_user_id=account.id, tenant_schema=institution.schema_name, device_hash=device_hash, role="INSTITUTION_ADMIN")

                if not trusted:
                    # Trigger OTP
                    from apps.identity.utils.otp_utils import send_otp_to_identifier
                    send_otp_to_identifier(account.email, account.email)
                    logger.info(f"[INST-AUTH] OTP Required for {account.email} in {institution.schema_name}")
                    return success_response("MFA Required", data={
                        "require_otp": True, 
                        "user_id": account.id,
                        "email_hint": account.email[:2] + "***" + account.email[account.email.find("@"):]
                    })

                logger.info(f"[INST-AUTH] Device Trusted for {account.email} in {institution.schema_name}")

                # 4. Success -> Centralized Login Handshake
                from apps.identity.services.auth_service import handle_login
                from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie

                identity_to_login = global_user if global_user else account

                login_data = handle_login(
                    identity=identity_to_login,
                    password=None,
                    ip=ip,
                    user_agent=ua,
                    request=request,
                    role_context="INSTITUTION_ADMIN",
                    custom_claims={
                        "schema": institution.schema_name,
                        "role": "INSTITUTION_ADMIN",
                        "email": account.email,
                        "tenant_user_id": account.id,
                        "user_id": identity_to_login.id if hasattr(identity_to_login, 'id') else None
                    }
                )

                resp = success_response("Login Successful", data={
                    "access": login_data["access"],
                    "role": "INSTITUTION_ADMIN",
                    "institution": institution.name,
                    "identifier": account.email,
                    "user_id": account.id,
                    "user": {
                        "id": identity_to_login.id if hasattr(identity_to_login, 'id') else account.id,
                        "email": account.email,
                        "username": account.email,
                        "role": "INSTITUTION_ADMIN",
                        "first_name": getattr(account, "first_name", ""),
                        "last_name": getattr(account, "last_name", ""),
                        "full_name": f"{getattr(account, 'first_name', '')} {getattr(account, 'last_name', '')}".strip()
                    }
                })

                set_quantum_shield(resp, login_data["fragments"])
                set_logged_in_cookie(resp, "true", role="INSTITUTION_ADMIN")
                
                return resp

            except AdminAuthorizedAccount.DoesNotExist:
                return error_response("Invalid credentials.", code=401)
            except Exception as e:
                logger.error(f"[INST-AUTH] Error in {institution.schema_name}: {str(e)}")
                import traceback
                traceback.print_exc()
                return error_response(f"Authentication failed: {str(e)}", code=500)


import logging
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password

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

        # 2. Resolve Schema from Institution ID
        # We need to access the public `Institution` model to get the schema_name
        from apps.identity.models.institution import Institution
        try:
            institution = Institution.objects.get(id=institution_id)
        except Institution.DoesNotExist:
            return error_response("Invalid Institution.", code=404)

        if not institution.schema_name:
             return error_response("Institution schema not ready.", code=400)

        # 3. Switch to Tenant Schema & Authenticate
        with schema_context(institution.schema_name):
            try:
                # Find the account in this specific tenant (Institutional Admin only for this view)
                from apps.auip_institution.models import AdminAuthorizedAccount
                account = AdminAuthorizedAccount.objects.filter(email=email, is_active=True).first()
                
                # Verify Password
                if not account or not check_password(password, account.password_hash):
                    logger.warning(f"[INST-AUTH] Failed login for {email} in schema {institution.schema_name}")
                    return error_response("Invalid credentials.", code=401)
                
                # 4. Success -> Centralized Login Handshake
                from apps.identity.services.auth_service import handle_login
                from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie

                # Passing the tenant-specific 'account' instead of global 'User'
                # This ensures institutional isolation: no record in public.User table.
                login_data = handle_login(
                    identity=account,
                    password=None,  # Already verified in tenant context
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

                resp = success_response("Login Successful", data={
                    "access": login_data["access"],
                    "refresh": login_data["refresh"],
                    "user": {
                        "id": account.id, 
                        "email": account.email,
                        "role": "INSTITUTION_ADMIN",
                        "institution_name": institution.name
                    }
                })

                # 5. Set 4-segment Quantum Shield & Flags
                set_quantum_shield(resp, login_data["fragments"])
                set_logged_in_cookie(resp, "true")  # ✅ Set to "true" for frontend guard
                
                logger.info(f"[INST-AUTH] ✅ Login SUCCESS for {email} in {institution.schema_name}")
                return resp

            except AdminAuthorizedAccount.DoesNotExist:
                return error_response("Invalid credentials.", code=401)
            except Exception as e:
                logger.error(f"[INST-AUTH] Error in {institution.schema_name}: {str(e)}")
                import traceback
                traceback.print_exc()
                return error_response(f"Authentication failed: {str(e)}", code=500)

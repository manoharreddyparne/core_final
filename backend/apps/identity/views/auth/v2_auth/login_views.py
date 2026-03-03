import logging
from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_tenants.utils import schema_context
from django.contrib.auth.hashers import check_password

from apps.identity.serializers.v2_auth import StudentLoginSerializer, FacultyLoginSerializer
from apps.identity.utils.turnstile import verify_turnstile_token
from apps.identity.utils.response_utils import success_response, error_response
from apps.auip_tenant.models import Client

logger = logging.getLogger(__name__)

class StudentLoginView(generics.GenericAPIView):
    """
    V2 Student Login: Institution + Identifier + Password.
    No OTP for students.
    """
    serializer_class = StudentLoginSerializer

    def post(self, request, *args, **kwargs):
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return error_response(f"Brute force detected. Your IP is blocked.", code=403)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('identifier', 'unknown'))
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        institution_id = serializer.validated_data['institution_id']
        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']
        turnstile_token = request.data.get('turnstile_token')
        
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, identifier)
            return error_response("Human verification failed.", code=403)
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import StudentPreSeededRegistry, StudentAuthorizedAccount
            try:
                account = StudentAuthorizedAccount.objects.get(email__iexact=identifier)
            except StudentAuthorizedAccount.DoesNotExist:
                 try:
                     reg = StudentPreSeededRegistry.objects.get(identifier__iexact=identifier)
                     account = StudentAuthorizedAccount.objects.get(registry_ref=reg)
                 except (StudentPreSeededRegistry.DoesNotExist, StudentAuthorizedAccount.DoesNotExist):
                     return error_response("Invalid credentials.", code=401)
            
            if not check_password(password, account.password_hash):
                attempts_left = register_global_failure(ip, ua, identifier)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left})
            
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            
            login_data = handle_login(
                identity=account, password=None, ip=ip, user_agent=ua, request=request, role_context="STUDENT",
                custom_claims={"schema": client.schema_name, "role": "STUDENT", "email": account.email, "tenant_user_id": account.id}
            )

            response = success_response("Login successful.", data={"access": login_data["access"], "role": "STUDENT", "institution": client.name, "user": {"id": account.id, "email": account.email, "role": "STUDENT"}})
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role="STUDENT")
            return response

class FacultyLoginView(generics.GenericAPIView):
    """
    V2 Faculty Login: Institution + Email + Password -> OTP MFA.
    """
    serializer_class = FacultyLoginSerializer

    def post(self, request, *args, **kwargs):
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return Response({"detail": "Access Revoked. IP Blacklisted."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('email', 'unknown'))
            return error_response("Invalid login data.", errors=serializer.errors)
        
        institution_id = serializer.validated_data['institution_id']
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        turnstile_token = request.data.get('turnstile_token')
        
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, email)
            return error_response("Human verification failed.", code=403)
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import FacultyAuthorizedAccount, AdminAuthorizedAccount
            account = FacultyAuthorizedAccount.objects.filter(email__iexact=email).first() or AdminAuthorizedAccount.objects.filter(email__iexact=email).first()
            if not account or not check_password(password, account.password_hash):
                attempts_left = register_global_failure(ip, ua, email)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left})
            
            from apps.identity.utils.device_utils import get_device_hash
            from apps.identity.utils.trust_utils import is_device_trusted
            device_hash = get_device_hash(ip, ua)
            is_faculty = account.role == "FACULTY"
            
            trusted = is_device_trusted(request, tenant_user_id=account.id, tenant_schema=client.schema_name, device_hash=device_hash, role="FACULTY" if is_faculty else "INSTITUTION_ADMIN")
            if trusted:
                from apps.identity.services.auth_service import handle_login
                from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
                final_role = "FACULTY" if is_faculty else "INSTITUTION_ADMIN"
                
                login_data = handle_login(
                    identity=account, password=None, ip=ip, user_agent=ua, request=request, role_context=final_role,
                    custom_claims={"schema": client.schema_name, "role": final_role, "email": account.email, "tenant_user_id": account.id}
                )
                response = success_response("Login successful (Trusted Device).", data={"access": login_data["access"], "role": final_role, "user": {"id": account.id, "email": account.email, "role": final_role}})
                set_quantum_shield(response, login_data["fragments"])
                set_logged_in_cookie(response, "true", role=final_role)
                return response

            from apps.identity.utils.otp_utils import send_otp_to_identifier
            send_otp_to_identifier(account.email, account.email)
            return success_response("Password verified. OTP challenge required.", data={"require_otp": True, "email_hint": account.email[:2] + "***" + account.email[account.email.find("@"):]})

class FacultyMFAVerifyView(generics.GenericAPIView):
    """
    Step 2 for Faculty: Verify OTP and Issue Token.
    """
    def post(self, request, *args, **kwargs):
        from apps.identity.utils.request_utils import get_client_ip
        ip = get_client_ip(request)
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        institution_id = request.data.get('institution_id')
        email = request.data.get('email')
        otp = request.data.get('otp')
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import FacultyAuthorizedAccount, AdminAuthorizedAccount
            requested_role = request.data.get('role', '').upper()
            
            # 🛡️ DISAMBIGUATION: Prioritize lookup based on requested role
            account = None
            if requested_role == "INSTITUTION_ADMIN" or requested_role == "INST_ADMIN":
                account = AdminAuthorizedAccount.objects.filter(email__iexact=email, is_active=True).first() or \
                          FacultyAuthorizedAccount.objects.filter(email__iexact=email, is_active=True).first()
            else:
                account = FacultyAuthorizedAccount.objects.filter(email__iexact=email, is_active=True).first() or \
                          AdminAuthorizedAccount.objects.filter(email__iexact=email, is_active=True).first()
            
            if not account:
                return error_response("Identity not found in this institution.", code=404)
            
            from apps.identity.utils.otp_utils import verify_otp_for_identifier
            if not verify_otp_for_identifier(account.email, otp):
                from apps.identity.services.security_service import register_global_failure
                register_global_failure(ip, ua, email)
                return error_response("Invalid or expired OTP.", code=400)
            
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            
            # Resolve final role correctly based on model type or explicit property
            is_admin_model = isinstance(account, AdminAuthorizedAccount)
            final_role = "INST_ADMIN" if is_admin_model else "FACULTY"
            
            login_data = handle_login(
                identity=account, password=None, ip=ip, user_agent=ua, request=request, role_context=final_role,
                custom_claims={"schema": client.schema_name, "role": final_role, "email": account.email, "tenant_user_id": account.id}
            )

            # ---------- Mark device trusted ----------
            should_trust = request.data.get("remember_device", False)
            trust_token = None
            if should_trust:
                from apps.identity.utils.trust_utils import trust_device
                from apps.identity.utils.device_utils import get_device_hash
                device_hash = get_device_hash(ip, ua)
                trust_token = trust_device(
                    tenant_user_id=account.id,
                    tenant_schema=client.schema_name,
                    tenant_email=account.email,
                    device_hash=device_hash,
                    ip=ip,
                    user_agent=ua,
                    role=final_role
                )

            response = success_response("Login successful.", data={"access": login_data["access"], "role": final_role, "user": {"id": account.id, "email": account.email, "role": final_role}})
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role=final_role)

            if should_trust and trust_token:
                from apps.identity.utils.trust_utils import set_trust_cookie
                set_trust_cookie(response, trust_token)

            return response

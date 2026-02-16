from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.hashers import make_password, check_password
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.serializers.v2_auth import (
    IdentityCheckSerializer, 
    ActivationCompleteSerializer,
    StudentLoginSerializer,
    FacultyLoginSerializer
)
from apps.identity.utils.activation import generate_activation_token, verify_activation_token, get_activation_url
from apps.identity.utils.turnstile import verify_turnstile_token
from apps.auip_tenant.models import Client
from apps.auip_institution.models import PreSeededRegistry, AuthorizedAccount
from apps.identity.utils.response_utils import success_response, error_response

class IdentityCheckView(generics.GenericAPIView):
    """
    Step 1: Validate Student/Faculty identity against institutional registry.
    Triggers an Activation Link email.
    """
    serializer_class = IdentityCheckSerializer

    def post(self, request, *args, **kwargs):
        # ✅ Global security check
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return Response({"detail": "Access Revoked. IP Blacklisted."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('identifier', 'unknown'))
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        client = serializer.validated_data['client']
        registry_entry = serializer.validated_data['registry_entry']
        
        token = generate_activation_token(client.id, registry_entry.identifier, registry_entry.role)
        activation_url = get_activation_url(token)
        
        # Log for dev, in prod this would be an email
        print(f"DEBUG: Activation Link for {registry_entry.identifier}: {activation_url}")
        
        return success_response("Identity verified. Activation link sent to registered email.")

class ActivationCompleteView(generics.GenericAPIView):
    """
    Step 2: Verify signed token and set password.
    Creates the AuthorizedAccount record in the tenant's schema.
    """
    serializer_class = ActivationCompleteSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        result = verify_activation_token(token)
        if not result:
            return error_response("Invalid or expired activation link.", code=400)
        
        institution_id, identifier, role = result
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            registry_entry = get_object_or_404(PreSeededRegistry, identifier=identifier)
            
            if registry_entry.is_active:
                return error_response("Account already activated.", code=400)
            
            # Create AuthorizedAccount with localized credentials
            account, created = AuthorizedAccount.objects.get_or_create(
                registry_ref=registry_entry,
                defaults={
                    "email": registry_entry.email,
                    "password_hash": make_password(password),
                    "role": role,
                    "is_active": True
                }
            )
            
            if not created:
                account.password_hash = make_password(password)
                account.save()
            
            registry_entry.is_active = True
            registry_entry.save()
            
        return success_response("Account activated successfully. You can now log in.", code=201)

class StudentLoginView(generics.GenericAPIView):
    """
    V2 Student Login: Institution + Identifier + Password.
    No OTP for students.
    """
    serializer_class = StudentLoginSerializer

    def post(self, request, *args, **kwargs):
        # ✅ Global security check
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure, get_remaining_attempts
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return Response({"detail": "Access Revoked. IP Blacklisted."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('identifier', 'unknown'))
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        institution_id = serializer.validated_data['institution_id']
        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']
        turnstile_token = request.data.get('turnstile_token')
        
        # 🛡️ SECURITY: Human Verification
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, identifier)
            return error_response("Human verification failed.", code=403)
        
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            try:
                # Student can login with email or roll number (identifier)
                account = AuthorizedAccount.objects.get(
                    email=identifier, 
                    role='STUDENT'
                )
            except AuthorizedAccount.DoesNotExist:
                 # Fallback to roll number lookup via registry
                 try:
                     reg = PreSeededRegistry.objects.get(identifier=identifier, role='STUDENT')
                     account = AuthorizedAccount.objects.get(registry_ref=reg)
                 except (PreSeededRegistry.DoesNotExist, AuthorizedAccount.DoesNotExist):
                     return error_response("Invalid credentials.", code=401)
            
            if not check_password(password, account.password_hash):
                attempts_left = get_remaining_attempts(ip)
                register_global_failure(ip, ua, identifier)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left - 1})
            
            # 🛡️ SECURITY: Centralized Login Handler (Quantum Shield + Session)
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            
            login_data = handle_login(
                identity=account,
                password=None, # Already checked above
                ip=ip,
                user_agent=ua,
                request=request,
                role_context="student"
            )

            response = success_response("Login successful.", data={
                "access": login_data["access"],
                "role": "STUDENT",
                "institution": client.name,
                "identifier": account.email
            })

            # 🍪 Set Quantum Shield (4-segment cookies)
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true")
            
            return response

class FacultyLoginView(generics.GenericAPIView):
    """
    V2 Faculty Login: Institution + Email + Password -> OTP MFA.
    """
    serializer_class = FacultyLoginSerializer

    def post(self, request, *args, **kwargs):
        # ✅ Global security check
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked, register_global_failure, get_remaining_attempts
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
        
        # 🛡️ SECURITY: Human Verification
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, email)
            return error_response("Human verification failed.", code=403)
        
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            try:
                account = AuthorizedAccount.objects.get(email=email, role__in=['FACULTY', 'ADMIN'])
            except AuthorizedAccount.DoesNotExist:
                return error_response("Invalid credentials.", code=401)
            
            if not check_password(password, account.password_hash):
                attempts_left = get_remaining_attempts(ip)
                register_global_failure(ip, ua, email)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left - 1})
            
            # Step 1 success: Credentials valid. Trigger OTP.
            from apps.identity.utils.otp_utils import send_otp_to_identifier
            send_otp_to_identifier(account.email, account.email)
            
            return success_response("Password verified. OTP challenge required.", data={
                "requires_otp": True,
                "email_hint": account.email[:2] + "***" + account.email[account.email.find("@"):]
            })

class FacultyMFAVerifyView(generics.GenericAPIView):
    """
    Step 2 for Faculty: Verify OTP and Issue Token.
    """
    def post(self, request, *args, **kwargs):
        institution_id = request.data.get('institution_id')
        email = request.data.get('email')
        otp = request.data.get('otp')
        
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            try:
                account = AuthorizedAccount.objects.get(email=email, role__in=['FACULTY', 'ADMIN'])
            except AuthorizedAccount.DoesNotExist:
                return error_response("Invalid session.", code=400)
            
            from apps.identity.utils.otp_utils import verify_otp_for_identifier
            if not verify_otp_for_identifier(account.email, otp):
                # Need ip, ua here
                from apps.identity.utils.request_utils import get_client_ip
                ip = get_client_ip(request)
                ua = request.META.get('HTTP_USER_AGENT', 'unknown')
                register_global_failure(ip, ua, email)
                return error_response("Invalid or expired OTP.", code=400)
            
            # 🛡️ SECURITY: Centralized Login Handler (Quantum Shield + Session)
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            
            login_data = handle_login(
                identity=account,
                password=None, # MFA already verified
                ip=ip,
                user_agent=ua,
                request=request,
                role_context="faculty"
            )

            response = success_response("Login successful.", data={
                "access": login_data["access"],
                "role": account.role,
                "institution": client.name,
                "identifier": account.email
            })

            # 🍪 Set Quantum Shield (4-segment cookies)
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true")
            
            return response

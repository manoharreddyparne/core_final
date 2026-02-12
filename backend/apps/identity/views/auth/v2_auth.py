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

class IdentityCheckView(generics.GenericAPIView):
    """
    Step 1: Validate Student/Faculty identity against institutional registry.
    Triggers an Activation Link email.
    """
    serializer_class = IdentityCheckSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        client = serializer.validated_data['client']
        registry_entry = serializer.validated_data['registry_entry']
        
        token = generate_activation_token(client.id, registry_entry.identifier, registry_entry.role)
        activation_url = get_activation_url(token)
        
        # Log for dev, in prod this would be an email
        print(f"DEBUG: Activation Link for {registry_entry.identifier}: {activation_url}")
        
        return Response({
            "detail": "Identity verified. Activation link sent to registered email.",
            "success": True,
            # "activation_url": activation_url  # In production, ONLY send via email.
        }, status=status.HTTP_200_OK)

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
            return Response({"detail": "Invalid or expired activation link."}, status=status.HTTP_400_BAD_REQUEST)
        
        institution_id, identifier, role = result
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            registry_entry = get_object_or_404(PreSeededRegistry, identifier=identifier)
            
            if registry_entry.is_active:
                return Response({"detail": "Account already activated."}, status=status.HTTP_400_BAD_REQUEST)
            
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
            
        return Response({
            "detail": "Account activated successfully. You can now log in.",
            "success": True
        }, status=status.HTTP_201_CREATED)

class StudentLoginView(generics.GenericAPIView):
    """
    V2 Student Login: Institution + Identifier + Password.
    No OTP for students.
    """
    serializer_class = StudentLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        institution_id = serializer.validated_data['institution_id']
        identifier = serializer.validated_data['identifier']
        password = serializer.validated_data['password']
        turnstile_token = request.data.get('turnstile_token')
        
        # 🛡️ SECURITY: Human Verification
        if not verify_turnstile_token(turnstile_token):
            return Response({"detail": "Human verification failed."}, status=status.HTTP_403_FORBIDDEN)
        
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
                     return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
            if not check_password(password, account.password_hash):
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
            # 🛡️ SECURITY: Device Fingerprinting
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', 'unknown')
            
            account.last_login_ip = ip
            account.last_login_ua = ua
            import django.utils.timezone as tz
            account.last_login_at = tz.now()
            account.save()

            response = Response({
                "success": True,
                "message": "Login successful.",
                "data": {
                    "role": "STUDENT",
                    "institution": client.name,
                    "identifier": account.email
                }
            }, status=status.HTTP_200_OK)

            # 🍪 SECURITY: Multi-Cookie Strategy (Non-HttpOnly tracker)
            response.set_cookie(
                'auip_authenticated', 
                'true', 
                max_age=3600 * 24 * 7, # 7 days
                samesite='Lax',
                secure=True # Only over HTTPS or localhost with secure flag
            )
            return response

class FacultyLoginView(generics.GenericAPIView):
    """
    V2 Faculty Login: Institution + Email + Password -> OTP MFA.
    """
    serializer_class = FacultyLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        institution_id = serializer.validated_data['institution_id']
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        turnstile_token = request.data.get('turnstile_token')
        
        # 🛡️ SECURITY: Human Verification
        if not verify_turnstile_token(turnstile_token):
            return Response({"detail": "Human verification failed."}, status=status.HTTP_403_FORBIDDEN)
        
        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            try:
                account = AuthorizedAccount.objects.get(email=email, role__in=['FACULTY', 'ADMIN'])
            except AuthorizedAccount.DoesNotExist:
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
            if not check_password(password, account.password_hash):
                return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
            
            # Step 1 success: Credentials valid. Trigger OTP.
            from apps.identity.utils.otp_utils import send_otp_to_identifier
            send_otp_to_identifier(account.email, account.email)
            
            return Response({
                "detail": "Password verified. OTP challenge required.",
                "requires_otp": True,
                "email_hint": account.email[:2] + "***" + account.email[account.email.find("@"):]
            }, status=status.HTTP_200_OK)

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
                return Response({"detail": "Invalid session."}, status=status.HTTP_400_BAD_REQUEST)
            
            from apps.identity.utils.otp_utils import verify_otp_for_identifier
            if not verify_otp_for_identifier(account.email, otp):
                return Response({"detail": "Invalid or expired OTP."}, status=status.HTTP_400_BAD_REQUEST)
            
            # 🛡️ SECURITY: Device Fingerprinting
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', 'unknown')
            
            account.last_login_ip = ip
            account.last_login_ua = ua
            import django.utils.timezone as tz
            account.last_login_at = tz.now()
            account.save()

            response = Response({
                "success": True,
                "message": "MFA Verified. Login successful.",
                "data": {
                    "role": account.role,
                    "institution": client.name,
                    "identifier": account.email
                }
            }, status=status.HTTP_200_OK)

            # 🍪 SECURITY: Multi-Cookie Strategy (Non-HttpOnly tracker)
            response.set_cookie(
                'auip_authenticated', 
                'true', 
                max_age=3600 * 24 * 7, # 7 days
                samesite='Lax',
                secure=True
            )
            return response

import logging
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
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

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
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            return error_response(
                f"Brute force detected. Your IP is blocked for {lockout_time // 60} minutes for security reasons.",
                code=403,
                data={"lockout_timer": lockout_time}
            )

        # 🛡️ SECURITY: Human Verification
        turnstile_token = request.data.get('turnstile_token')
        ua = request.META.get('HTTP_USER_AGENT', 'unknown')
        from apps.identity.utils.turnstile import verify_turnstile_token
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, request.data.get('identifier', 'unknown'))
            return error_response("Human verification failed.", code=403)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            # Catch the specific 'already_activated' case from serializer
            errors = serializer.errors
            
            # DRF might wrap the dict or use non_field_errors
            is_already_active = False
            if isinstance(errors, dict):
                # Check root or non_field_errors
                err_list = errors.get('non_field_errors', [])
                if not isinstance(err_list, list): err_list = [err_list]
                
                # Check custom 'code' field if we raised a dict
                if errors.get('code') == ["ALREADY_ACTIVATED"] or errors.get('code') == "ALREADY_ACTIVATED":
                    is_already_active = True
                
                # Check within non_field_errors
                for err in err_list:
                    if isinstance(err, dict) and err.get('code') == "ALREADY_ACTIVATED":
                        is_already_active = True

            if is_already_active:
                return success_response(
                    "Account already activated. Please login with your credentials.",
                    data={"already_activated": True}
                )
            
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('identifier', 'unknown'))
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        client = serializer.validated_data['client']
        registry_entry = serializer.validated_data['registry_entry']
        role = serializer.validated_data['role']

        # 🔄 Delegate to Centralized Activation Service
        from apps.identity.services.activation_service import ActivationService
        try:
            ActivationService.create_tenant_invitation(
                registry_entry=registry_entry,
                schema=client.schema_name,
                entry_type=role.lower()
            )
            return success_response("Identity verified. Physical activation link dispatched to registered email.")
        except ValueError as ve:
            return error_response(str(ve), code=429)
        except Exception as e:
            logger.error(f"[ACTIVATION-ERROR] {e}")
            return error_response("Failed to dispatch activation signal.", code=500)

class ActivationCompleteView(generics.GenericAPIView):
    """
    Step 2: Verify signed token and set password.
    Creates the AuthorizedAccount record in the tenant's schema.
    
    GET: Validate token and return user info before showing form.
    POST: Complete activation by setting password.
    """
    serializer_class = ActivationCompleteSerializer

    def get(self, request, *args, **kwargs):
        """Validate activation token and return user details."""
        
        token = request.query_params.get("token")
        if not token:
            return error_response("Token required.", code=400)
        
        # 🛡️ New Token Structure: "schema.role.identifier.random"
        parts = token.split(".")
        if len(parts) < 2:
            return error_response("Malformed activation link.", code=400)
        
        schema = parts[0]
        # Robust parsing for backward/forward compatibility
        if len(parts) == 4:
            role_hint = parts[1]
            identifier_hint = parts[2]
        else:
            role_hint = None
            identifier_hint = None
        
        from django.utils import timezone
        try:
            with schema_context(schema):
                from apps.auip_institution.models import (
                    StudentPreSeededRegistry, FacultyPreSeededRegistry, AdminPreSeededRegistry
                )
                
                # 1. Primary Check: Find by active token
                registry_entry = None
                role = None
                
                registry_entry = StudentPreSeededRegistry.objects.filter(activation_token=token).first()
                if registry_entry:
                    role = 'STUDENT'
                else:
                    registry_entry = FacultyPreSeededRegistry.objects.filter(activation_token=token).first()
                    if registry_entry:
                        role = 'FACULTY'
                    else:
                        registry_entry = AdminPreSeededRegistry.objects.filter(activation_token=token).first()
                        if registry_entry:
                            role = 'ADMIN'
                
                # 2. Secondary Check: If token not found but it's a new-style token, check activation status
                if not registry_entry and role_hint and identifier_hint:
                    if role_hint == 'STUDENT':
                        registry_entry = StudentPreSeededRegistry.objects.filter(identifier=identifier_hint).first()
                    elif role_hint in ('FACULTY', 'ADMIN'):
                        model = FacultyPreSeededRegistry if role_hint == 'FACULTY' else AdminPreSeededRegistry
                        registry_entry = model.objects.filter(identifier=identifier_hint).first()
                    
                    if registry_entry:
                        role = role_hint
                        if registry_entry.is_activated:
                            return success_response("Account already activated.", data={
                                "email": registry_entry.email,
                                "identifier": registry_entry.identifier,
                                "role": role,
                                "already_activated": True,
                            })
                        else:
                            return error_response("Activation link has been replaced or invalidated.", code=400)

                if not registry_entry:
                    return error_response("Invalid or expired activation link.", code=400)
                
                if registry_entry.token_expires_at and registry_entry.token_expires_at < timezone.now():
                    return error_response("Activation link has expired.", code=400)
                
                already_activated = registry_entry.is_activated
                
                return success_response("Token valid.", data={
                    "email": registry_entry.email,
                    "identifier": registry_entry.identifier,
                    "role": role,
                    "already_activated": already_activated,
                })
        except Exception as e:
            logger.error(f"[ActivationComplete-GET] Error: {e}")
            return error_response("Failed to validate token.", code=500)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        # 🛡️ Token Structure: "schema.random_token"
        if "." not in token:
            return error_response("Malformed activation link.", code=400)
            
        schema, secret = token.split(".", 1)
        
        from django.utils import timezone
        with schema_context(schema):
            from apps.auip_institution.models import (
                StudentPreSeededRegistry, StudentAuthorizedAccount,
                FacultyPreSeededRegistry, FacultyAuthorizedAccount,
                AdminPreSeededRegistry, AdminAuthorizedAccount
            )
            
            # Find registry entry by token across all possible registries
            registry_entry = None
            role = None
            
            # Try Student
            registry_entry = StudentPreSeededRegistry.objects.filter(activation_token=token).first()
            if registry_entry:
                role = 'STUDENT'
            else:
                # Try Faculty
                registry_entry = FacultyPreSeededRegistry.objects.filter(activation_token=token).first()
                if registry_entry:
                    role = 'FACULTY'
                else:
                    # Try Admin
                    registry_entry = AdminPreSeededRegistry.objects.filter(activation_token=token).first()
                    if registry_entry:
                        role = 'ADMIN'

            if not registry_entry:
                return error_response("Invalid or expired activation link.", code=400)
                
            if registry_entry.token_expires_at and registry_entry.token_expires_at < timezone.now():
                return error_response("Activation link has expired.", code=400)
                
            if registry_entry.is_activated:
                return error_response("Account already activated.", code=400)

            # Determine Account Model and Academic Link
            academic_record = None
            if role == 'STUDENT':
                acc_model = StudentAuthorizedAccount
                from apps.auip_institution.models import StudentAcademicRegistry
                academic_record = StudentAcademicRegistry.objects.filter(roll_number=registry_entry.identifier).first()
            elif role == 'FACULTY':
                acc_model = FacultyAuthorizedAccount
                from apps.auip_institution.models import FacultyAcademicRegistry
                academic_record = FacultyAcademicRegistry.objects.filter(employee_id=registry_entry.identifier).first()
            else:
                acc_model = AdminAuthorizedAccount

            # Create Account
            account, created = acc_model.objects.get_or_create(
                registry_ref=registry_entry,
                defaults={
                    "email": registry_entry.email if role != 'ADMIN' else registry_entry.identifier,
                    "password_hash": make_password(password),
                    "is_active": True,
                    "academic_ref": academic_record # Link the academic source of truth
                }
            )
            
            if not created and academic_record:
                account.academic_ref = academic_record
                account.password_hash = make_password(password)
                account.save()
            elif not created:
                account.password_hash = make_password(password)
                account.save()
            
            # Finalize
            registry_entry.is_activated = True
            registry_entry.activated_at = timezone.now()
            registry_entry.activation_token = None # 🗑️ Burn token after use
            registry_entry.save()
            
            # 🚀 Auto-Login Implementation
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            from apps.identity.utils.request_utils import get_client_ip
            
            ua = request.META.get('HTTP_USER_AGENT', 'unknown')
            ip = get_client_ip(request)
            
            login_data = handle_login(
                identity=account,
                password=None, # Already set
                ip=ip,
                user_agent=ua,
                request=request,
                role_context=role,
                custom_claims={
                    "schema": schema,
                    "role": role,
                    "email": account.email,
                    "tenant_user_id": account.id
                }
            )

            response = success_response("Account activated successfully.", data={
                "access": login_data["access"],
                "refresh": login_data["refresh"],
                "user": {
                    "id": account.id,
                    "email": account.email,
                    "role": role,
                },
                "already_activated": True
            }, code=210) # Using 210 to signify 'Activated & Logged In'

            # 🍪 Set Quantum Shield
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role=role)
            
            return response

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
        lockout_time = is_ip_blocked(ip)
        if lockout_time:
            return error_response(
                f"Brute force detected. Your IP is blocked for {lockout_time // 60} minutes for security reasons.",
                code=403,
                data={"lockout_timer": lockout_time}
            )

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
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import StudentPreSeededRegistry, StudentAuthorizedAccount
            try:
                # Student can login with email or roll number (identifier)
                account = StudentAuthorizedAccount.objects.get(
                    email__iexact=identifier
                )
            except StudentAuthorizedAccount.DoesNotExist:
                 # Fallback to roll number lookup via registry
                 try:
                     reg = StudentPreSeededRegistry.objects.get(identifier__iexact=identifier)
                     account = StudentAuthorizedAccount.objects.get(registry_ref=reg)
                 except (StudentPreSeededRegistry.DoesNotExist, StudentAuthorizedAccount.DoesNotExist):
                     return error_response("Invalid credentials.", code=401)
            
            if not check_password(password, account.password_hash):
                attempts_left = register_global_failure(ip, ua, identifier)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left})
            
            # 🛡️ ADAPTIVE AUTH: Check if device is trusted
            from apps.identity.utils.device_utils import get_device_hash
            from apps.identity.utils.trust_utils import is_device_trusted
            device_hash = get_device_hash(ip, ua)
            
            # For students, we only bypass MFA if they actually have it enabled.
            # Currently Students don't have MFA, but we check trust for security audit consistency.
            trusted = is_device_trusted(request, tenant_user_id=account.id, tenant_schema=client.schema_name, device_hash=device_hash, role="STUDENT")

            # If Students ever get MFA, we would add the challenge trigger here.
            # if not trusted and account.mfa_enabled: ...

            # 🛡️ SECURITY: Centralized Login Handler (Quantum Shield + Session)
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            
            login_data = handle_login(
                identity=account,
                password=None, # Already checked above
                ip=ip,
                user_agent=ua,
                request=request,
                role_context="STUDENT",
                custom_claims={
                    "schema": client.schema_name,
                    "role": "STUDENT",
                    "email": account.email,
                    "tenant_user_id": account.id
                }
            )

            response = success_response("Login successful.", data={
                "access": login_data["access"],
                "role": "STUDENT",
                "institution": client.name,
                "identifier": account.email,
                "user": {
                    "id": account.id,
                    "email": account.email,
                    "username": account.email,
                    "role": "STUDENT",
                    "first_name": getattr(account, "first_name", ""),
                    "last_name": getattr(account, "last_name", ""),
                }
            })

            # 🍪 Set Quantum Shield (4-segment cookies)
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role="STUDENT")
            
            # 🛡️ Optionally Trust Device for Students (Consistency)
            if request.data.get("remember_device"):
                from apps.identity.utils.trust_utils import trust_device, set_trust_cookie
                trust_token = trust_device(
                    tenant_user_id=account.id,
                    tenant_schema=client.schema_name,
                    tenant_email=account.email,
                    device_hash=device_hash,
                    ip=ip,
                    user_agent=ua,
                    role="STUDENT"
                )
                if trust_token:
                    set_trust_cookie(response, trust_token)
            
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
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import FacultyAuthorizedAccount, AdminAuthorizedAccount
            try:
                # Try Faculty first
                account = FacultyAuthorizedAccount.objects.filter(email__iexact=email).first()
                if not account:
                    # Fallback to Admin
                    account = AdminAuthorizedAccount.objects.filter(email__iexact=email).first()
                
                if not account:
                    return error_response("Invalid credentials.", code=401)
            except Exception:
                return error_response("Invalid credentials.", code=401)
            
            if not check_password(password, account.password_hash):
                attempts_left = register_global_failure(ip, ua, email)
                return error_response("Invalid credentials.", code=401, data={"attempts_remaining": attempts_left})
            
            # 🛡️ ADAPTIVE 2FA: Check if device is trusted
            from apps.identity.utils.device_utils import get_device_hash
            from apps.identity.utils.trust_utils import is_device_trusted
            device_hash = get_device_hash(ip, ua)
            
            is_faculty = account.role == "FACULTY"
            
            trusted = False
            if is_faculty:
                trusted = is_device_trusted(request, tenant_user_id=account.id, tenant_schema=client.schema_name, device_hash=device_hash, role="FACULTY")
            else:
                from apps.identity.models.core_models import User
                global_user = User.objects.filter(email=account.email).first()
                if global_user:
                    trusted = is_device_trusted(request, user=global_user, device_hash=device_hash, role="INSTITUTION_ADMIN")
                
                if not trusted:
                    # Fallback to tenant-specific trust
                    trusted = is_device_trusted(
                        request, 
                        tenant_user_id=account.id, 
                        tenant_schema=client.schema_name, 
                        device_hash=device_hash,
                        role="INSTITUTION_ADMIN"
                    )

            if trusted:
                # Skip OTP and perform immediate login
                from apps.identity.services.auth_service import handle_login
                from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
                
                # Normalize roles
                identity_to_login = account
                final_role = "FACULTY" if is_faculty else "INSTITUTION_ADMIN"
                
                logger.info(f"[FACULTY-AUTH] Trusted Login: email={account.email}, is_faculty={is_faculty}, role={final_role}, model={account.__class__.__name__}")
                
                if not is_faculty:
                    from apps.identity.models.core_models import User
                    global_user = User.objects.filter(email=account.email).first()
                    if global_user:
                        identity_to_login = global_user

                login_data = handle_login(
                    identity=identity_to_login,
                    password=None, # Already trusted
                    ip=ip,
                    user_agent=ua,
                    request=request,
                    role_context=final_role,
                    custom_claims={
                        "schema": client.schema_name,
                        "role": final_role,
                        "email": account.email,
                        "tenant_user_id": account.id,
                        "user_id": identity_to_login.id if hasattr(identity_to_login, 'id') else None
                    }
                )

                response = success_response("Login successful (Trusted Device).", data={
                    "access": login_data["access"],
                    "role": final_role,
                    "institution": client.name,
                    "identifier": account.email,
                    "already_activated": True,
                    "user": {
                        "id": identity_to_login.id if hasattr(identity_to_login, 'id') else account.id,
                        "email": account.email,
                        "username": account.email,
                        "role": final_role,
                        "first_name": getattr(account, "first_name", ""),
                        "last_name": getattr(account, "last_name", ""),
                        "full_name": f"{getattr(account, 'first_name', '')} {getattr(account, 'last_name', '')}".strip()
                    }
                })

                set_quantum_shield(response, login_data["fragments"])
                set_logged_in_cookie(response, "true", role=final_role)
                return response

            # Step 1 success: Credentials valid. Trigger OTP.
            from apps.identity.utils.otp_utils import send_otp_to_identifier
            send_otp_to_identifier(account.email, account.email)
            
            return success_response("Password verified. OTP challenge required.", data={
                "require_otp": True,
                "email_hint": account.email[:2] + "***" + account.email[account.email.find("@"):]
            })

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
        remember_device = request.data.get('remember_device', False)
        
        from apps.identity.models.institution import Institution
        inst = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=inst.schema_name)
        
        with schema_context(client.schema_name):
            from apps.auip_institution.models import FacultyAuthorizedAccount, AdminAuthorizedAccount
            try:
                account = FacultyAuthorizedAccount.objects.filter(email__iexact=email).first()
                if not account:
                    account = AdminAuthorizedAccount.objects.get(email__iexact=email)
            except Exception:
                return error_response("Invalid session.", code=400)
            
            from apps.identity.utils.otp_utils import verify_otp_for_identifier
            if not verify_otp_for_identifier(account.email, otp):
                from apps.identity.services.security_service import register_global_failure
                register_global_failure(ip, ua, email)
                return error_response("Invalid or expired OTP.", code=400)
            
            # 🛡️ SECURITY: Centralized Login Handler (Quantum Shield + Session)
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            from apps.identity.models.core_models import User
            
            # ✅ V2 CRITICAL FIX: Bind to Global User for Admins
            identity_to_login = account
            
            # Normalize role strings consistently
            raw_role = account.role if hasattr(account, 'role') else "FACULTY"
            final_role = "INSTITUTION_ADMIN" if raw_role in ["INST_ADMIN", "INSTITUTION_ADMIN", "ADMIN"] else raw_role
            
            logger.info(f"[FACULTY-MFA] Resolved Role: {final_role} (raw: {raw_role}) for {account.email}")
            
            if final_role == "INSTITUTION_ADMIN":
                global_user = User.objects.filter(email=account.email).first()
                if global_user:
                    identity_to_login = global_user

            login_data = handle_login(
                identity=identity_to_login,
                password=None, # MFA already verified
                ip=ip,
                user_agent=ua,
                request=request,
                role_context=final_role, # Use the actual role (FACULTY or INSTITUTION_ADMIN)
                custom_claims={
                    "schema": client.schema_name,
                    "role": final_role,
                    "email": account.email,
                    "tenant_user_id": account.id,
                    "user_id": identity_to_login.id if hasattr(identity_to_login, 'id') else None
                }
            )

            response = success_response("Login successful.", data={
                "access": login_data["access"],
                "role": final_role,
                "institution": client.name,
                "identifier": account.email,
                "user_id": identity_to_login.id if hasattr(identity_to_login, 'id') else account.id,
                "user": {
                    "id": identity_to_login.id if hasattr(identity_to_login, 'id') else account.id,
                    "email": account.email,
                    "username": account.email,
                    "role": final_role,
                    "first_name": getattr(account, "first_name", ""),
                    "last_name": getattr(account, "last_name", ""),
                    "full_name": f"{getattr(account, 'first_name', '')} {getattr(account, 'last_name', '')}".strip()
                }
            })

            # 🍪 Set Quantum Shield (4-segment cookies)
            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role=final_role)

            # 🛡️ TRUST DEVICE logic
            if remember_device:
                from apps.identity.utils.device_utils import get_device_hash
                from apps.identity.utils.trust_utils import trust_device, set_trust_cookie
                
                device_hash = get_device_hash(ip, ua)
                
                if final_role == "FACULTY":
                    trust_token = trust_device(
                        tenant_user_id=account.id,
                        tenant_schema=client.schema_name,
                        tenant_email=account.email,
                        device_hash=device_hash,
                        ip=ip,
                        user_agent=ua,
                        role="FACULTY"
                    )
                else:
                    # InstAdmin
                    global_user = User.objects.filter(email=account.email).first()
                    if global_user:
                        trust_token = trust_device(
                            user=global_user,
                            device_hash=device_hash,
                            ip=ip,
                            user_agent=ua,
                            role="INSTITUTION_ADMIN"
                        )
                    else:
                        # Fallback to tenant context if no global user
                        trust_token = trust_device(
                            tenant_user_id=account.id,
                            tenant_schema=client.schema_name,
                            tenant_email=account.email,
                            device_hash=device_hash,
                            ip=ip,
                            user_agent=ua,
                            role="INSTITUTION_ADMIN"
                        )
                
                if trust_token:
                    set_trust_cookie(response, trust_token)
            
            return response

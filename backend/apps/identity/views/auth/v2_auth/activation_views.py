import logging
from rest_framework import generics, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django_tenants.utils import schema_context
from django.utils import timezone
from django.contrib.auth.hashers import make_password

from apps.identity.serializers.v2_auth import IdentityCheckSerializer, ActivationCompleteSerializer
from apps.identity.utils.turnstile import verify_turnstile_token
from apps.identity.utils.response_utils import success_response, error_response
from apps.auip_tenant.models import Client

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
        if not verify_turnstile_token(turnstile_token):
            register_global_failure(ip, ua, request.data.get('identifier', 'unknown'))
            return error_response("Human verification failed.", code=403)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            logger.debug(f"[ACTIVATION] Serializer errors: {errors}")
            is_already_active = False
            if isinstance(errors, dict):
                # DRF wraps values as ErrorDetail — must use str() for comparison
                code_val = str(errors.get('code', ''))
                if code_val == 'ALREADY_ACTIVATED':
                    is_already_active = True
                err_list = errors.get('non_field_errors', [])
                if not isinstance(err_list, list):
                    err_list = [err_list]
                for err in err_list:
                    if isinstance(err, dict) and str(err.get('code', '')) == 'ALREADY_ACTIVATED':
                        is_already_active = True
                    elif hasattr(err, 'code') and str(err.code) == 'ALREADY_ACTIVATED':
                        is_already_active = True

            if is_already_active:
                return success_response(
                    "Account already activated. Please login with your credentials.",
                    data={"already_activated": True}
                )
            
            register_global_failure(ip, request.META.get('HTTP_USER_AGENT', 'unknown'), request.data.get('identifier', 'unknown'))
            logger.warning(f"[ACTIVATION] Request failed with errors: {errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        client = serializer.validated_data['client']
        registry_entry = serializer.validated_data['registry_entry']
        role = serializer.validated_data['role']

        from apps.identity.services.activation_service import ActivationService
        try:
            ActivationService.create_tenant_invitation(
                registry_entry=registry_entry,
                schema=client.schema_name,
                entry_type=role.lower()
            )
            return success_response(
                "Identity verified. Physical activation link dispatched to registered email.",
                data={"email": serializer.validated_data.get('email')}
            )
        except ValueError as ve:
            return error_response(str(ve), code=429)
        except Exception as e:
            logger.error(f"[ACTIVATION-ERROR] {e}")
            return error_response("Failed to dispatch activation signal.", code=500)

class ActivationCompleteView(generics.GenericAPIView):
    """
    Step 2: Verify signed token and set password.
    """
    serializer_class = ActivationCompleteSerializer

    def get(self, request, *args, **kwargs):
        token = request.query_params.get("token")
        if not token:
            return error_response("Token required.", code=400)
        
        parts = token.split(".")
        if len(parts) < 2:
            return error_response("Malformed activation link.", code=400)
        
        schema = parts[0]
        role_hint = parts[1] if len(parts) == 4 else None
        identifier_hint = parts[2] if len(parts) == 4 else None
        
        try:
            with schema_context(schema):
                from apps.auip_institution.models import (
                    StudentPreSeededRegistry, FacultyPreSeededRegistry, AdminPreSeededRegistry
                )
                
                registry_entry = StudentPreSeededRegistry.objects.filter(activation_token=token).first()
                role = 'STUDENT' if registry_entry else None
                
                if not registry_entry:
                    registry_entry = FacultyPreSeededRegistry.objects.filter(activation_token=token).first()
                    role = 'FACULTY' if registry_entry else None
                
                if not registry_entry:
                    registry_entry = AdminPreSeededRegistry.objects.filter(activation_token=token).first()
                    role = 'ADMIN' if registry_entry else None

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
                
                return success_response("Token valid.", data={
                    "email": registry_entry.email,
                    "identifier": registry_entry.identifier,
                    "role": role,
                    "already_activated": registry_entry.is_activated,
                })
        except Exception as e:
            logger.error(f"[ActivationComplete-GET] Error: {e}")
            return error_response("Failed to validate token.", code=500)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        if "." not in token:
            return error_response("Malformed activation link.", code=400)
        schema, _ = token.split(".", 1)
        
        with schema_context(schema):
            from apps.auip_institution.models import (
                StudentPreSeededRegistry, StudentAuthorizedAccount,
                FacultyPreSeededRegistry, FacultyAuthorizedAccount,
                AdminPreSeededRegistry, AdminAuthorizedAccount
            )
            
            registry_entry = StudentPreSeededRegistry.objects.filter(activation_token=token).first()
            role = 'STUDENT' if registry_entry else None
            
            if not registry_entry:
                registry_entry = FacultyPreSeededRegistry.objects.filter(activation_token=token).first()
                role = 'FACULTY' if registry_entry else None
            
            if not registry_entry:
                registry_entry = AdminPreSeededRegistry.objects.filter(activation_token=token).first()
                role = 'ADMIN' if registry_entry else None

            if not registry_entry:
                return error_response("Invalid or expired activation link.", code=400)
            if registry_entry.token_expires_at and registry_entry.token_expires_at < timezone.now():
                return error_response("Activation link has expired.", code=400)
            if registry_entry.is_activated:
                return error_response("Account already activated.", code=400)

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

            account, created = acc_model.objects.get_or_create(
                registry_ref=registry_entry,
                defaults={
                    "email": registry_entry.email if role != 'ADMIN' else registry_entry.identifier,
                    "password_hash": make_password(password),
                    "is_active": True,
                    "academic_ref": academic_record
                }
            )
            
            if not created:
                if academic_record: account.academic_ref = academic_record
                account.password_hash = make_password(password)
                account.save()
            
            registry_entry.is_activated = True
            registry_entry.activated_at = timezone.now()
            registry_entry.activation_token = None
            registry_entry.save()
            
            from apps.identity.services.auth_service import handle_login
            from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
            from apps.identity.utils.request_utils import get_client_ip
            
            ua = request.META.get('HTTP_USER_AGENT', 'unknown')
            ip = get_client_ip(request)
            
            login_data = handle_login(
                identity=account, password=None, ip=ip, user_agent=ua, request=request, role_context=role,
                custom_claims={"schema": schema, "role": role, "email": account.email, "tenant_user_id": account.id}
            )

            response = success_response("Account activated successfully.", data={
                "access": login_data["access"], "refresh": login_data["refresh"],
                "user": {"id": account.id, "email": account.email, "role": role},
                "already_activated": True
            }, code=210)

            set_quantum_shield(response, login_data["fragments"])
            set_logged_in_cookie(response, "true", role=role)
            return response

# users/views/profile/profile_views.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from apps.identity.models import User, StudentProfile, TeacherProfile, LoginSession
from apps.identity.serializers.user_serializers import (
    UserSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
)
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)


class UserProfileView(APIView):
    """
    Aggregated profile endpoint (GET):
    - Returns base user info
    - Role-specific info
    - Security info (recent devices, last login, 2FA)
    
    Separate PATCH endpoints should handle:
    - Profile update (ProfileUpdateView)
    - Password/security updates (ProfileSecurityView)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from apps.identity.models.core_models import User
        from apps.identity.serializers.user_serializers import UserSerializer
        from django_tenants.utils import schema_context
        
        # Determine if we need a schema context
        # Tenant users always have a 'schema' claim in their JWT
        token = request.auth # ValidatedToken
        schema = token.get('schema') if token else None
        is_global_user = isinstance(user, User)

        if schema:
            with schema_context(schema):
                return self._process_profile_request(request, user, is_global_user, schema)
        return self._process_profile_request(request, user, is_global_user, None)

    def _process_profile_request(self, request, user, is_global_user, schema):
        from apps.identity.models.core_models import User
        from apps.identity.serializers.user_serializers import UserSerializer
        from apps.identity.models import LoginSession

        try:
            # ---------- Base User Info ----------
            if is_global_user:
                user_data = UserSerializer(user).data
            else:
                # Localized Tenant User
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "first_name": getattr(user, 'first_name', ''),
                    "last_name": getattr(user, 'last_name', ''),
                    "username": getattr(user, 'username', user.email),
                    "role": user.role,
                    "is_active": user.is_active,
                }

            # ---------- Role-specific Info ----------
            role_info = {}
            if user.role == "STUDENT":
                # 🚀 Dynamic Attribute Harvesting from Academic Registry (STUDENTS ONLY)
                profile = getattr(user, "academic_ref", None)
                if profile:
                    excluded_fields = {'id', 'created_at', 'updated_at', 'history_data', 'sgpa_history', 'password_hash', 'mfa_secret'}
                    for field in profile._meta.fields:
                        if field.name not in excluded_fields:
                            val = getattr(profile, field.name)
                            if hasattr(val, 'to_eng_string') or isinstance(val, (float, int)):
                                val = str(val)
                            elif val is None:
                                val = "N/A"
                                
                            role_info[field.name] = {
                                "label": field.verbose_name.title(),
                                "value": val
                            }
                    
                    role_info["read_only"] = True
                    role_info["intelligence_mode"] = "DYNAMIC" 

            elif user.role == "FACULTY":
                role_info = {
                    "designation": {"label": "Designation", "value": getattr(user, 'designation', 'Staff')},
                    "department": {"label": "Department", "value": getattr(user, 'department', 'N/A')},
                    "read_only": False
                }
            elif user.role in ("ADMIN", "INSTITUTION_ADMIN"):
                level = "Institution" if user.role == "INSTITUTION_ADMIN" else "Superuser"
                role_info = {
                    "admin_level": {"label": "Admin Level", "value": level},
                    "read_only": False
                }

            # ---------- Security Info ----------
            try:
                from django.db.models import Q
                from django_tenants.utils import schema_context as global_schema_context
                
                # Security queries MUST happen in public schema
                with global_schema_context('public'):
                    if not is_global_user:
                        recent_sessions = (
                            LoginSession.objects.filter(tenant_user_id=user.id, tenant_schema=schema, role=user.role)
                            .order_by("-last_active")[:3]
                            .values("ip_address", "user_agent", "last_active")
                        )
                    else:
                        recent_sessions = (
                            LoginSession.objects.filter(user=user)
                            .order_by("-last_active")[:3]
                            .values("ip_address", "user_agent", "last_active")
                        )
                    security_list = list(recent_sessions)
            except Exception:
                security_list = []

            security_info = {
                "last_login": getattr(user, 'last_login', getattr(user, 'last_login_at', None)),
                "recent_devices": security_list,
                "two_factor_enabled": bool(getattr(user, "mfa_secret", None)) if not is_global_user else getattr(user, "two_factor_enabled", False),
            }

            # ---------- Aggregate ----------
            data = {
                "user": user_data,
                "role_info": role_info,
                "security_info": security_info,
            }

            return success_response("Profile retrieved successfully.", data=data)

        except Exception as e:
            logger.exception(f"[UserProfileView] Failed to fetch profile for user {getattr(user, 'id', 'unknown')}: {e}")
            return error_response("Failed to fetch profile data.", code=500)

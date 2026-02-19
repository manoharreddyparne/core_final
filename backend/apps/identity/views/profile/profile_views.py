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
        
        is_global_user = isinstance(user, User)
        
        try:
            # ---------- Base User Info ----------
            if is_global_user:
                user_data = UserSerializer(user).data
            else:
                # Localized Tenant User
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "username": getattr(user, 'username', user.email),
                    "role": user.role,
                    "is_active": user.is_active,
                }

            # ---------- Role-specific Info ----------
            role_info = {}
            if user.role == "STUDENT":
                # Check for localized student profile or registry
                profile = getattr(user, "academic_ref", None)
                if profile:
                    role_info = {
                        "full_name": profile.full_name,
                        "roll_number": profile.roll_number,
                        "program": getattr(profile, 'program', ''),
                        "branch": getattr(profile, 'branch', ''),
                        "batch_year": getattr(profile, 'batch_year', ''),
                    }
            elif user.role == "FACULTY":
                role_info = {
                    "designation": getattr(user, 'designation', ''),
                    "department": getattr(user, 'department', ''),
                }
            elif user.role in ("ADMIN", "INSTITUTION_ADMIN"):
                role_info = {"admin_level": "institution" if user.role == "INSTITUTION_ADMIN" else "superuser"}

            # ---------- Security Info ----------
            try:
                from django.db.models import Q
                if not is_global_user:
                    schema = getattr(request.auth, 'get', lambda x, y: '')('schema', '')
                    recent_sessions = (
                        LoginSession.objects.filter(tenant_user_id=user.id, tenant_schema=schema)
                        .order_by("-last_active")[:3]
                        .values("ip_address", "user_agent", "last_active")
                    )
                else:
                    recent_sessions = (
                        LoginSession.objects.filter(user=user)
                        .order_by("-last_active")[:3]
                        .values("ip_address", "user_agent", "last_active")
                    )
            except Exception:
                recent_sessions = []

            security_info = {
                "last_login": getattr(user, 'last_login', getattr(user, 'last_login_at', None)),
                "recent_devices": list(recent_sessions),
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

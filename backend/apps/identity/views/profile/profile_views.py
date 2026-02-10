# users/views/profile/profile_views.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.models import User, StudentProfile, TeacherProfile, LoginSession
from users.serializers.user_serializers import (
    UserSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
)
from users.utils.response_utils import success_response, error_response

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
        user: User = request.user
        try:
            # ---------- Base User Info ----------
            user_data = UserSerializer(user).data

            # ---------- Role-specific Info ----------
            role_info = {}
            if user.role == User.Roles.STUDENT:
                profile: StudentProfile = getattr(user, "student_profile", None)
                if profile:
                    role_info = StudentProfileSerializer(profile).data
            elif user.role == User.Roles.TEACHER:
                profile: TeacherProfile = getattr(user, "teacher_profile", None)
                if profile:
                    role_info = TeacherProfileSerializer(profile).data
            elif user.role == User.Roles.ADMIN:
                role_info = {"admin_level": "superuser"}  # extend later with permissions

            # ---------- Security Info ----------
            try:
                recent_sessions = (
                    LoginSession.objects.filter(user=user)
                    .order_by("-last_active")[:3]
                    .values("ip_address", "user_agent", "last_active")
                )
            except Exception:
                recent_sessions = []

            security_info = {
                "last_login": user.last_login,
                "recent_devices": list(recent_sessions),
                "two_factor_enabled": getattr(user, "two_factor_enabled", False),
            }

            # ---------- Aggregate ----------
            data = {
                "user": user_data,
                "role_info": role_info,
                "security_info": security_info,
            }

            return success_response("Profile retrieved successfully.", data=data)

        except Exception as e:
            logger.exception(f"[UserProfileView] Failed to fetch profile for user {user.id}: {e}")
            return error_response("Failed to fetch profile data.", code=500)

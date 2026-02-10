# users/views/profile/profile_update.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from users.models import User
from users.serializers.user_serializers import (
    UserUpdateSerializer,
    StudentProfileUpdateSerializer,
    TeacherProfileUpdateSerializer,
)
from users.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

class ProfileUpdateView(APIView):
    """
    Handles partial updates to user profile info:
    - Name, avatar, other basic info
    - Role-specific fields (student: roll_number, batch; teacher: department, subjects)
    - Does NOT handle sensitive fields like passwords or roles
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]  # support file uploads for avatar

    def patch(self, request):
        user: User = request.user
        data = request.data.copy()  # avoid mutation

        try:
            # Choose serializer based on role
            if user.role == User.Roles.STUDENT:
                if hasattr(user, "student_profile"):
                    serializer = StudentProfileUpdateSerializer(user.student_profile, data=data, partial=True)
                else:
                    return error_response("Student profile not found.", code=404)
            elif user.role == User.Roles.TEACHER:
                if hasattr(user, "teacher_profile"):
                    serializer = TeacherProfileUpdateSerializer(user.teacher_profile, data=data, partial=True)
                else:
                    return error_response("Teacher profile not found.", code=404)
            else:
                # Admin or generic user
                serializer = UserUpdateSerializer(user, data=data, partial=True)

            if serializer.is_valid():
                serializer.save()
                logger.info(f"[ProfileUpdateView] User {user.id} ({user.email}) updated profile info.")
                return success_response("Profile updated successfully.", data=serializer.data)

            return error_response("Invalid profile data.", errors=serializer.errors)

        except Exception as e:
            logger.exception(f"[ProfileUpdateView] Update failed for user {user.id}: {e}")
            return error_response("Failed to update profile.", code=500)

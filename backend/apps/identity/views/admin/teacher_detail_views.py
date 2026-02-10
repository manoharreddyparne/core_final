# ✅ FINAL — users/views/admin/teacher_detail_views.py

import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.models import User, TeacherProfile
from users.serializers.user_serializers import (
    TeacherProfileSerializer,
    TeacherProfileUpdateSerializer,
)
from users.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)


class AdminTeacherDetailView(APIView):
    """
    Admin:
      GET   → fetch teacher full profile
      PATCH → update teacher profile fields
    """

    permission_classes = [IsAuthenticated]

    def get_object(self, pk: int):
        try:
            return TeacherProfile.objects.select_related("user").get(id=pk)
        except TeacherProfile.DoesNotExist:
            return None

    # ------------------------
    # GET
    # ------------------------
    def get(self, request, pk: int):
        if request.user.role != User.Roles.ADMIN:
            return error_response("Admin access required", code=403)

        profile = self.get_object(pk)
        if not profile:
            return error_response("Teacher not found", code=404)

        data = TeacherProfileSerializer(profile).data
        return success_response("Fetched teacher profile", data=data)

    # ------------------------
    # PATCH
    # ------------------------
    def patch(self, request, pk: int):
        if request.user.role != User.Roles.ADMIN:
            return error_response("Admin access required", code=403)

        profile = self.get_object(pk)
        if not profile:
            return error_response("Teacher not found", code=404)

        serializer = TeacherProfileUpdateSerializer(
            profile, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()
            logger.info(f"[AdminTeacherDetailView] Updated teacher={pk}")
            return success_response("Teacher updated", data=serializer.data)

        return error_response("Invalid data", errors=serializer.errors)

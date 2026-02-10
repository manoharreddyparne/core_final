import logging
from rest_framework.views import APIView
from apps.identity.permissions import IsAdminRole
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)


class AdminStudentDetailView(APIView):
    """
    Admin:
      GET   → fetch student full profile
      PATCH → update student profile fields
    """

    permission_classes = [IsAdminRole]

    def get_object(self, pk: int):
        try:
            return StudentProfile.objects.select_related("user").get(id=pk)
        except StudentProfile.DoesNotExist:
            return None

    # ------------------------
    # GET
    # ------------------------
    def get(self, request, pk: int):
        profile = self.get_object(pk)
        if not profile:
            return error_response("Student not found", code=404)

        data = StudentProfileSerializer(profile).data
        return success_response("Fetched student profile", data=data)

    # ------------------------
    # PATCH
    # ------------------------
    def patch(self, request, pk: int):
        profile = self.get_object(pk)
        if not profile:
            return error_response("Student not found", code=404)

        serializer = StudentProfileUpdateSerializer(
            profile, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()
            logger.info(f"[AdminStudentDetailView] Updated student={pk}")
            return success_response("Student updated", data=serializer.data)

        return error_response("Invalid data", errors=serializer.errors)

# users/views/admin/teacher_admin_views.py
import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from users.models import User, TeacherProfile
from users.serializers.user_serializers import TeacherProfileSerializer
from users.utils.general_utils import generate_random_password
from users.utils.email_utils import send_welcome_email
from users.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)


class CreateTeacherView(APIView):
    """
    Admin endpoint to create single or multiple teachers.
    - Generates random password
    - Sends welcome email
    - Tracks created and skipped teachers
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        teachers_data = request.data.get("teachers", [])
        created_teachers = []
        skipped_teachers = []

        for t in teachers_data:
            email = t.get("email")
            if not email:
                skipped_teachers.append({"email": email, "reason": "Missing email"})
                continue

            if User.objects.filter(username=email).exists():
                skipped_teachers.append({"email": email, "reason": "Duplicate"})
                continue

            try:
                with transaction.atomic():
                    password = generate_random_password()
                    teacher = User.objects.create_user(
                        username=email,
                        email=email,
                        password=password,
                        role=User.Roles.TEACHER,
                        first_time_login=True,
                        need_password_reset=True,
                    )

                    TeacherProfile.objects.create(
                        user=teacher,
                        department=t.get("department", "")
                    )

                    try:
                        send_welcome_email(teacher, password)
                    except Exception as e:
                        logger.warning(f"Failed to send welcome email to {email}: {e}")

                    created_teachers.append({
                        "email": email,
                        "department": t.get("department", ""),
                        "password": password
                    })

            except Exception as e:
                logger.error(f"Failed to create teacher {email}: {e}")
                skipped_teachers.append({"email": email, "reason": str(e)})

        logger.info(f"{len(created_teachers)} teachers created, {len(skipped_teachers)} skipped.")
        return success_response("Teachers processed", {"created": created_teachers, "skipped": skipped_teachers})


class TeacherProfileSearchView(APIView):
    """
    Admin endpoint to search/filter teacher profiles by department or email.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        qs = TeacherProfile.objects.select_related("user").all()
        department = request.query_params.get("department")
        email = request.query_params.get("email")

        if department:
            qs = qs.filter(department__icontains=department)
        if email:
            qs = qs.filter(user__email__icontains=email)

        serializer = TeacherProfileSerializer(qs, many=True)
        return success_response("Teacher profiles fetched", serializer.data)

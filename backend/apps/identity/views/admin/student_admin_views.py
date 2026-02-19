# users/views/admin/student_admin_views.py
import logging
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from apps.identity.models import User, StudentProfile
from apps.identity.serializers.user_serializers import StudentProfileSerializer
from apps.identity.utils.general_utils import generate_random_password, export_students_to_csv
from apps.identity.utils.email_utils import send_welcome_email
from apps.identity.utils.response_utils import success_response, error_response

from apps.identity.permissions import IsAdminRole

logger = logging.getLogger(__name__)


class CreateStudentView(APIView):
    """
    Admin endpoint to create single or multiple students.
    - Generates random password
    - Sends welcome email
    - Tracks created and skipped students
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        data = request.data
        created_students = []
        skipped_students = []

        students_list = [data] if isinstance(data, dict) else data if isinstance(data, list) else None
        if students_list is None:
            return error_response("Invalid payload. Expected dict or list of dicts.", status.HTTP_400_BAD_REQUEST)

        for s in students_list:
            roll_number = s.get("roll_number")
            email = s.get("email")

            if not roll_number or not email:
                skipped_students.append({
                    "roll_number": roll_number,
                    "email": email,
                    "reason": "Missing required fields"
                })
                continue

            if User.objects.filter(username=roll_number).exists() or User.objects.filter(email=email).exists():
                skipped_students.append({
                    "roll_number": roll_number,
                    "email": email,
                    "reason": "Duplicate"
                })
                continue

            try:
                with transaction.atomic():
                    password = generate_random_password()
                    student = User.objects.create_user(
                        username=roll_number,
                        email=email,
                        password=password,
                        role=User.Roles.STUDENT,
                        first_time_login=True,
                        need_password_reset=True,
                    )

                    StudentProfile.objects.create(
                        user=student,
                        roll_number=roll_number,
                        admission_year=s.get("admission_year", ""),
                        batch=s.get("batch", ""),
                    )

                    try:
                        send_welcome_email(student, password)
                    except Exception as e:
                        logger.warning(f"Failed to send welcome email to {email}: {e}")

                    created_students.append({
                        "roll_number": roll_number,
                        "email": email,
                        "password": password
                    })

            except Exception as e:
                logger.error(f"Failed to create student {roll_number}: {e}")
                skipped_students.append({
                    "roll_number": roll_number,
                    "email": email,
                    "reason": str(e)
                })

        if created_students:
            export_students_to_csv(created_students)

        logger.info(f"{len(created_students)} students created, {len(skipped_students)} skipped.")
        return success_response("Students processed", {"created": created_students, "skipped": skipped_students})


class StudentProfileSearchView(APIView):
    """
    Admin endpoint to search/filter student profiles by roll number or batch.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = StudentProfile.objects.all()
        roll_number = request.query_params.get("roll_number")
        batch = request.query_params.get("batch")

        if roll_number:
            qs = qs.filter(roll_number__icontains=roll_number)
        if batch:
            qs = qs.filter(batch__icontains=batch)

        serializer = StudentProfileSerializer(qs, many=True)
        return success_response("Student profiles fetched", serializer.data)


class BulkInviteStudentsView(APIView):
    """
    Admin endpoint to send activation emails to seeded students.
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        student_refs = request.data.get("student_refs", [])
        if not student_refs:
            return error_response("student_refs list required", code=400)

        from apps.identity.services.activation_service import ActivationService
        
        results = []
        for ref in student_refs:
            try:
                ActivationService.create_invitation(ref)
                results.append({"stu_ref": ref, "status": "success"})
            except Exception as e:
                logger.error(f"Failed to invite student {ref}: {e}")
                results.append({"stu_ref": ref, "status": "error", "message": str(e)})

        return success_response("Invitations processed", data=results)

# users/views/admin/teacher_admin_views.py
import logging
import secrets
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction

from apps.identity.models import User, TeacherProfile
from apps.identity.serializers.user_serializers import TeacherProfileSerializer
from apps.identity.utils.general_utils import generate_random_password
from apps.identity.utils.email_utils import send_welcome_email
from apps.identity.utils.response_utils import success_response, error_response

from apps.identity.permissions import IsAdminRole

logger = logging.getLogger(__name__)


class CreateTeacherView(APIView):
    """
    Admin endpoint to create single or multiple teachers.
    - Generates random password
    - Sends welcome email
    - Tracks created and skipped teachers
    """
    permission_classes = [IsAdminRole]

    def post(self, request):
        from apps.identity.utils.tenant_utils import get_user_institution
        institution = get_user_institution(request.user)
        
        if not institution:
            return error_response("Institution context not found for user.", code=status.HTTP_400_BAD_REQUEST)

        teachers_data = request.data.get("teachers", [])
        created_teachers = []
        skipped_teachers = []

        for t in teachers_data:
            email = t.get("email")
            full_name = t.get("full_name", "")
            if not email:
                skipped_teachers.append({"email": email, "reason": "Missing email"})
                continue

            if User.objects.filter(email=email).exists():
                skipped_teachers.append({"email": email, "reason": "User with this email already exists"})
                continue

            try:
                with transaction.atomic():
                    password = generate_random_password()
                    # Generate a unique username if not provided, or use email
                    username = email.split('@')[0] + "_" + secrets.token_hex(4)
                    
                    teacher = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        role=User.Roles.TEACHER,
                        first_time_login=True,
                        need_password_reset=True,
                    )
                    
                    if full_name:
                        teacher.first_name = full_name.split(' ')[0]
                        teacher.last_name = ' '.join(full_name.split(' ')[1:])
                        teacher.save()

                    TeacherProfile.objects.create(
                        user=teacher,
                        institution=institution,
                        department=t.get("department", "")
                    )

                    try:
                        send_welcome_email(teacher, password)
                    except Exception as e:
                        logger.warning(f"Failed to send welcome email to {email}: {e}")

                    created_teachers.append({
                        "email": email,
                        "username": username,
                        "department": t.get("department", ""),
                    })

            except Exception as e:
                logger.error(f"Failed to create teacher {email}: {e}")
                skipped_teachers.append({"email": email, "reason": str(e)})

        logger.info(f"{len(created_teachers)} teachers created for institution {institution.name}")
        return success_response("Teachers processed", {"created": created_teachers, "skipped": skipped_teachers})


class TeacherProfileSearchView(APIView):
    """
    Admin endpoint to search/filter teacher profiles by department or email within their institution.
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        from apps.identity.utils.tenant_utils import get_user_institution
        institution = get_user_institution(request.user)
        
        if not institution and not request.user.role == User.Roles.SUPER_ADMIN:
            return error_response("Institution context required.", code=status.HTTP_400_BAD_REQUEST)

        qs = TeacherProfile.objects.select_related("user").all()
        
        if not request.user.role == User.Roles.SUPER_ADMIN:
            qs = qs.filter(institution=institution)
            
        department = request.query_params.get("department")
        email = request.query_params.get("email")

        if department:
            qs = qs.filter(department__icontains=department)
        if email:
            qs = qs.filter(user__email__icontains=email)

        serializer = TeacherProfileSerializer(qs, many=True)
        return success_response("Teacher profiles fetched", serializer.data)

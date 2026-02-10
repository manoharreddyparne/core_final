"""
Student Account Activation View
"""

import logging
from rest_framework import status, permissions
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone

from apps.identity.models import User, StudentProfile, CoreStudent, StudentInvitation
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

class StudentActivationView(APIView):
    """
    Consumer endpoint for activation tokens.
    1. Validates token
    2. Collects password
    3. Creates User and StudentProfile
    4. Marks invitation and CoreStudent as active
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Pre-fetch student info via token (for frontend form)"""
        token = request.query_params.get('token')
        if not token:
            return error_response("Token required", status_code=400)

        try:
            invitation = StudentInvitation.objects.get(token=token, is_used=False)
            if invitation.expires_at < timezone.now():
                return error_response("Token expired", status_code=400)
            
            student = invitation.student
            return success_response("Token valid", {
                "full_name": student.full_name,
                "email": student.official_email,
                "roll_number": student.roll_number,
                "department": student.department,
                "institution": student.institution.name if student.institution else None
            })
        except StudentInvitation.DoesNotExist:
            return error_response("Invalid or used token", status_code=404)

    def post(self, request):
        """Actual activation - creating the account"""
        token = request.data.get('token')
        password = request.data.get('password')
        username = request.data.get('username') # Optional, default to roll_number

        if not token or not password:
            return error_response("Token and password required", status_code=400)

        try:
            with transaction.atomic():
                invitation = StudentInvitation.objects.select_for_update().get(token=token, is_used=False)
                if invitation.expires_at < timezone.now():
                    return error_response("Token expired", status_code=400)

                student = invitation.student
                
                # Check if user already exists (safety check)
                if User.objects.filter(email=student.official_email).exists():
                    return error_response("An account with this email already exists", status_code=400)

                # 1. Create User
                user = User.objects.create_user(
                    username=username or student.roll_number,
                    email=student.official_email,
                    password=password,
                    role=User.Roles.STUDENT,
                    stu_ref=student,
                    first_time_login=False
                )

                # 2. Create Student Profile
                StudentProfile.objects.create(
                    user=user,
                    institution=student.institution,
                    roll_number=student.roll_number,
                    admission_year=str(student.batch_year),
                    branch=student.department
                )

                # 3. Mark activation as complete
                invitation.is_used = True
                invitation.activated_at = timezone.now()
                invitation.save()

                student.status = 'ACTIVE'
                student.save()

                logger.info(f"[Activation] success student={student.roll_number} email={user.email}")
                
                return success_response("Account activated successfully. You can now login.", {
                    "email": user.email,
                    "role": user.role
                })

        except StudentInvitation.DoesNotExist:
            return error_response("Invalid or used token", status_code=404)
        except Exception as e:
            logger.error(f"[Activation] error={e}")
            return error_response(f"Activation failed: {str(e)}", status_code=500)

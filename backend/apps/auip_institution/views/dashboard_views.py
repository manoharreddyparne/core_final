from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework.response import Response
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin, IsTenantFaculty
from apps.auip_institution.models import StudentAuthorizedAccount, FacultyAuthorizedAccount, StudentAcademicRegistry
from apps.identity.utils.response_utils import success_response, error_response
from django_tenants.utils import schema_context

class InstDashboardStatsView(APIView):
    """
    Returns real-time stats for the Institutional Dashboard.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin | IsTenantFaculty]

    def get(self, request):
        institution = getattr(request.user, 'institution', None)
        user = request.user
        role = getattr(user, 'role', 'UNKNOWN')
        
        # 🔗 Determine Schema
        schema = institution.schema_name if institution else None
        if not schema:
            token = getattr(request, 'auth', {})
            schema = token.get('schema') if isinstance(token, dict) else None

        if not schema:
            return error_response("Schema context not found.")

        with schema_context(schema):
            from apps.auip_institution.models import (
                StudentAuthorizedAccount, 
                FacultyAuthorizedAccount, 
                StudentAcademicRegistry,
                FacultyAcademicRegistry
            )
            from apps.academic.models.classroom import TeacherAssignment, StudentEnrollment

            if role == "FACULTY":
                # 🎓 Educator-Specific Intelligence
                # Registry ref for employee_id
                emp_id = None
                if hasattr(user, 'academic_ref') and user.academic_ref:
                    emp_id = user.academic_ref.employee_id
                else:
                    # Fallback for staff
                    emp_id = getattr(user, 'username', user.email)

                # Active Courses = Assignments
                active_assignments = TeacherAssignment.objects.filter(employee_id__iexact=emp_id)
                active_courses_count = active_assignments.values('subject').distinct().count()
                
                # Total Students = Distinct students in assigned subjects
                assigned_subjects = active_assignments.values_list('subject_id', flat=True)
                total_students = StudentEnrollment.objects.filter(subject_id__in=assigned_subjects).values('roll_number').distinct().count()

                data = {
                    "active_courses": active_courses_count,
                    "total_students": total_students,
                    "pending_tasks": 0, # Placeholder for now
                    "role_context": "FACULTY",
                    "institution_name": institution.name if institution else "Academic Institution",
                }
            else:
                # 🏛️ Administrative Oversight
                total_students = StudentAcademicRegistry.objects.count()
                active_students = StudentAuthorizedAccount.objects.filter(is_active=True).count()
                verified_faculty = FacultyAuthorizedAccount.objects.filter(is_active=True).count()
                total_faculty = FacultyAcademicRegistry.objects.count()
                
                # Mock readiness
                readiness = 98 if total_students > 0 else 0
                
                data = {
                    "total_students": total_students,
                    "active_students": active_students,
                    "verified_faculty": verified_faculty,
                    "total_faculty": total_faculty,
                    "exam_readiness": f"{readiness}%",
                    "role_context": "INST_ADMIN",
                    "institution_name": institution.name if institution else "Academic Institution",
                }
            
        return success_response("Dashboard stats retrieved", data=data)

from rest_framework.views import APIView
from rest_framework.response import Response
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.auip_institution.models import StudentAuthorizedAccount, FacultyAuthorizedAccount, StudentAcademicRegistry
from apps.identity.utils.response_utils import success_response
from django_tenants.utils import schema_context

class InstDashboardStatsView(APIView):
    """
    Returns real-time stats for the Institutional Dashboard.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        institution = request.user.institution
        
        with schema_context(institution.schema_name):
            total_students = StudentAcademicRegistry.objects.count()
            active_students = StudentAuthorizedAccount.objects.filter(is_active=True).count()
            verified_faculty = FacultyAuthorizedAccount.objects.filter(is_active=True).count()
            
            # Mock readiness for now as requested, but calculate from real data if possible
            readiness = 98 if total_students > 0 else 0
            
        data = {
            "total_students": total_students,
            "active_students": active_students,
            "verified_faculty": verified_faculty,
            "exam_readiness": f"{readiness}%",
            "institution_name": institution.name,
        }
        
        return success_response("Dashboard stats retrieved", data=data)

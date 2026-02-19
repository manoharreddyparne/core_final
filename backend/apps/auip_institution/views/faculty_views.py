from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response
from apps.auip_institution.models import FacultyAuthorizedAccount, FacultyPreSeededRegistry

logger = logging.getLogger(__name__)

class FacultyViewSet(viewsets.ModelViewSet):
    """
    Tenant-Isolated Faculty Management for Institutional Admins.
    Path: /api/institution/faculty/
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    serializer_class = None # TODO: Create FacultySerializer
    lookup_field = 'email'

    def get_queryset(self):
        from django_tenants.utils import schema_context
        with schema_context(self.request.user.institution.schema_name):
            return FacultyAuthorizedAccount.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        # We'll return both active and pre-seeded faculty for the registry view
        from apps.auip_institution.models import FacultyPreSeededRegistry
        
        with schema_context(request.user.institution.schema_name):
            active_faculty = list(queryset.values('id', 'email', 'designation', 'department', 'joining_date'))
            pre_seeded = list(FacultyPreSeededRegistry.objects.filter(is_activated=False).values('identifier', 'email', 'created_at'))
            
            # Formulate a unified list for the dashboard
            data = {
                "active": active_faculty,
                "pending": pre_seeded,
                "total": len(active_faculty) + len(pre_seeded)
            }
            
        return success_response("Faculty registry retrieved", data=data)

    @action(detail=False, methods=['post'], url_path='invite')
    def invite(self, request):
        """
        Invite a new educator to the platform.
        """
        email = request.data.get('email')
        identifier = request.data.get('identifier') # Employee ID
        
        if not email or not identifier:
            return error_response("Email and Employee ID required.", code=400)
            
        with schema_context(request.user.institution.schema_name):
            try:
                pre, created = FacultyPreSeededRegistry.objects.get_or_create(
                    identifier=identifier,
                    defaults={'email': email}
                )
                if not created and pre.is_activated:
                    return error_response("Account already active.", code=400)
                
                # TODO: Trigger invitation email
                
                return success_response("Educator invited successfully", data={
                    "identifier": identifier,
                    "email": email,
                    "status": "PENDING"
                })
            except Exception as e:
                logger.error(f"Failed to invite faculty: {e}")
                return error_response("Internal server error during invitation.")

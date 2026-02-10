"""
Core Student Administration Views - Multi-tenant aware
"""

import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.identity.models.core import CoreStudent
from apps.identity.serializers.core_serializers import CoreStudentSerializer
from apps.identity.permissions import IsAdminRole
from apps.identity.utils.tenant_utils import get_user_institution
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

class CoreStudentAdminViewSet(viewsets.ModelViewSet):
    """
    Institution Admin:
      CRUD for pre-seeded students.
      Strictly filtered by institutional context.
    """
    serializer_class = CoreStudentSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['stu_ref', 'roll_number', 'full_name', 'official_email']
    ordering_fields = ['stu_ref', 'full_name', 'batch_year']
    lookup_field = 'stu_ref'

    def get_queryset(self):
        user = self.request.user
        institution = get_user_institution(user)
        
        # SuperAdmin sees all
        if user.role == "SUPER_ADMIN":
            return CoreStudent.objects.all()
        
        if not institution:
            return CoreStudent.objects.none()
            
        return CoreStudent.objects.filter(institution=institution)

    def perform_create(self, serializer):
        institution = get_user_institution(self.request.user)
        serializer.save(
            institution=institution,
            seeded_by=self.request.user.email
        )
        logger.info(f"[CoreStudent-Create] user={self.request.user.email} stu={serializer.validated_data['stu_ref']}")

    @action(detail=True, methods=['post'])
    def send_invitation(self, request, stu_ref=None):
        """Trigger activation email for a single student."""
        student = self.get_object()
        from apps.identity.services.activation_service import ActivationService
        
        try:
            ActivationService.create_invitation(student.stu_ref)
            return success_response("Invitation sent")
        except Exception as e:
            logger.error(f"[CoreStudent-Invite] error={e}")
            return error_response(str(e))

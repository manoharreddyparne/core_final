from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from apps.identity.models.core_models import CoreStudent
from apps.identity.serializers.core_serializers import CoreStudentSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

class RegisteredStudentViewSet(viewsets.ModelViewSet):
    """
    Tenant-Isolated Student Management for Institutional Admins.
    Path: /api/institution/students/
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    from apps.auip_institution.serializers import StudentAcademicRegistrySerializer
    serializer_class = StudentAcademicRegistrySerializer
    lookup_field = 'roll_number'
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['roll_number', 'full_name', 'official_email', 'branch']
    ordering_fields = ['roll_number', 'full_name', 'batch_year']

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return success_response("Students retrieved successfully", data=serializer.data)

    def get_queryset(self):
        from apps.auip_institution.models import StudentAcademicRegistry
        from django_tenants.utils import schema_context
        # Use schema context from the authenticated user
        with schema_context(self.request.user.institution.schema_name):
            return StudentAcademicRegistry.objects.all()

    def perform_create(self, serializer):
        serializer.save(
            institution=self.request.user.institution,
            seeded_by=self.request.user.email
        )
        logger.info(f"[TenantStudent-Create] user={self.request.user.email} stu={serializer.validated_data.get('stu_ref')}")

    @action(detail=True, methods=['post'])
    def send_invitation(self, request, stu_ref=None):
        """Trigger activation email for a single student."""
        student = self.get_object()
        from apps.identity.services.activation_service import ActivationService
        
        try:
            # Reusing the existing service logic
            ActivationService.create_invitation(student.stu_ref)
            return success_response("Invitation sent")
        except Exception as e:
            logger.error(f"[TenantStudent-Invite] error={e}")
            return error_response(str(e), code=400)


from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
import csv
import io
from django.db import transaction
from apps.identity.serializers.core_serializers import (
    CoreStudentBulkUploadSerializer,
    BulkUploadResponseSerializer
)

class TenantBulkStudentUploadView(APIView):
    """
    Tenant-Isolated Bulk Student Upload.
    Path: /api/institution/bulk-seed-students/
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if 'file' not in request.FILES:
            return error_response("CSV file required", code=400)

        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return error_response("File must be a CSV", code=400)

        try:
            decoded_file = csv_file.read().decode('utf-8')
        except UnicodeDecodeError:
            return error_response("CSV must be UTF-8 encoded", code=400)

        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        
        # Validate critical headers
        required_headers = {'roll_number', 'full_name', 'official_email'}
        if not required_headers.issubset(set(reader.fieldnames or [])):
             return error_response(f"Missing headers. Required: {required_headers}", code=400)

        from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry
        from django_tenants.utils import schema_context
        
        institution = request.user.institution
        total_rows = 0
        successful = 0
        failed = 0
        errors = []

        # Process within tenant schema
        with schema_context(institution.schema_name):
            with transaction.atomic():
                for row_idx, row in enumerate(reader, start=2):
                    total_rows += 1
                    try:
                        roll_number = row.get('roll_number')
                        email = row.get('official_email')
                        full_name = row.get('full_name')

                        # 1. 🛡️ Populate Secured Academic Table
                        academic, _ = StudentAcademicRegistry.objects.update_or_create(
                            roll_number=roll_number,
                            defaults={
                                "full_name": full_name,
                                "official_email": email,
                                "personal_email": row.get('personal_email'),
                                "program": row.get('program', ''),
                                "branch": row.get('branch', ''),
                                "batch_year": int(row.get('batch_year')) if row.get('batch_year') else None,
                                "current_semester": int(row.get('current_semester')) if row.get('current_semester') else 1,
                                "section": row.get('section', ''),
                                "cgpa": row.get('cgpa') if row.get('cgpa') else None,
                                "admission_year": int(row.get('admission_year')) if row.get('admission_year') else None,
                                "passout_year": int(row.get('passout_year')) if row.get('passout_year') else None,
                                "date_of_birth": row.get('date_of_birth') if row.get('date_of_birth') else None,
                            }
                        )

                        # 2. 🆔 Populate Pre-Seeded Identity (for activation)
                        StudentPreSeededRegistry.objects.update_or_create(
                            identifier=roll_number,
                            defaults={"email": email}
                        )

                        successful += 1
                    except Exception as e:
                        failed += 1
                        errors.append({"row": row_idx, "error": str(e)})

        return success_response("Bulk student seeding completed", data={
            "total": total_rows,
            "success": successful,
            "failed": failed,
            "errors": errors
        })

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
import logging
import csv
import io
from django_tenants.utils import schema_context
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.auip_institution.models import FacultyAcademicRegistry, FacultyPreSeededRegistry
from apps.identity.utils.response_utils import success_response, error_response
from apps.academic.models import Department

logger = logging.getLogger(__name__)

from apps.auip_institution.serializers import FacultyAcademicRegistrySerializer

class RegisteredFacultyViewSet(viewsets.ModelViewSet):
    """
    Tenant-Isolated Faculty Management for Institutional Admins.
    Path: /api/institution/faculty/
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    lookup_field = 'employee_id'
    serializer_class = FacultyAcademicRegistrySerializer
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee_id', 'full_name', 'email', 'department', 'designation']
    ordering_fields = ['employee_id', 'full_name', 'department', 'joining_date']

    def get_queryset(self):
        institution = self.request.user.institution
        with schema_context(institution.schema_name):
            return FacultyAcademicRegistry.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Apply department filter if activeDept != 'ALL'
        dept = request.query_params.get('department')
        if dept and dept != 'ALL':
            queryset = queryset.filter(department=dept)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return success_response("Faculty retrieved successfully", data=serializer.data)

    def create(self, request, *args, **kwargs):
        institution = self.request.user.institution
        with schema_context(institution.schema_name):
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            # 🔄 Synchronize with Pre-Seeded Registry
            FacultyPreSeededRegistry.objects.get_or_create(
                identifier=instance.employee_id,
                defaults={"email": instance.email}
            )
            return success_response("Educator provisioned successfully", data=serializer.data)

    def update(self, request, *args, **kwargs):
        institution = self.request.user.institution
        with schema_context(institution.schema_name):
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            instance = serializer.save()
            # 🔄 Sync Registry
            FacultyPreSeededRegistry.objects.filter(identifier=instance.employee_id).update(email=instance.email)
            return success_response("Educator record updated", data=serializer.data)

    def destroy(self, request, *args, **kwargs):
        institution = self.request.user.institution
        with schema_context(institution.schema_name):
            instance = self.get_object()
            emp_id = instance.employee_id
            instance.delete()
            # 🗑️ Clean up pre-seeded registry if not activated
            FacultyPreSeededRegistry.objects.filter(identifier=emp_id, is_activated=False).delete()
            return success_response("Educator record removed")

    @action(detail=False, methods=['get'])
    def departments(self, request):
        """Get unique list of departments."""
        institution = request.user.institution
        with schema_context(institution.schema_name):
            depts = self.get_queryset().values_list('department', flat=True).distinct()
            return success_response("Departments retrieved", data=list(filter(None, depts)))

    @action(detail=False, methods=['post'])
    def bulk_invite(self, request):
        """Trigger activation links for multiple faculty members."""
        identifiers = request.data.get('identifiers', [])
        if not identifiers:
            return error_response("List of employee identifiers required", code=400)

        from apps.identity.services.activation_service import ActivationService
        
        institution = request.user.institution
        summary = {
            "invited": [],
            "already_activated": [],
            "not_found": [],
            "failed": []
        }

        with schema_context(institution.schema_name):
            for emp_id in identifiers:
                emp_id = str(emp_id).strip()
                try:
                    f = FacultyPreSeededRegistry.objects.filter(identifier__iexact=emp_id).first()
                    if not f:
                        summary["not_found"].append(emp_id)
                        continue
                    
                    if f.is_activated:
                        summary["already_activated"].append(emp_id)
                        continue
                    
                    ActivationService.create_tenant_invitation(f, institution.schema_name, entry_type="faculty")
                    summary["invited"].append(emp_id)
                except Exception as e:
                    logger.error(f"[FACULTY-INVITE] Failed for {emp_id}: {e}")
                    summary["failed"].append({"identifier": emp_id, "error": str(e)})

        total_success = len(summary["invited"])
        return success_response(
            f"Successfully dispatched {total_success} activation signals.",
            data=summary
        )

class TenantBulkFacultyUploadView(APIView):
    """
    Bulk Faculty Seeding with Preview/Diff support.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if 'file' not in request.FILES:
            return error_response("CSV file required", code=400)

        preview_mode = request.data.get('preview', 'false').lower() == 'true'
        csv_file = request.FILES['file']
        
        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return error_response(f"File process error: {str(e)}", code=400)
        
        institution = request.user.institution
        new_faculty = []
        updates = []
        errors = []

        with schema_context(institution.schema_name):
            for row in reader:
                emp_id = row.get('employee_id')
                if not emp_id: continue
                
                try:
                    existing = FacultyAcademicRegistry.objects.filter(employee_id=emp_id).first()
                    incoming_data = self._clean_row(row)
                    
                    if existing:
                        # 🔍 Compute Diff
                        diff = {}
                        for key, val in incoming_data.items():
                            old_val = getattr(existing, key, None)
                            if str(old_val) != str(val):
                                diff[key] = {"old": old_val, "new": val}
                        
                        if diff:
                            updates.append({
                                "employee_id": emp_id,
                                "full_name": existing.full_name,
                                "diff": diff
                            })
                            if not preview_mode:
                                for key, val in incoming_data.items():
                                    setattr(existing, key, val)
                                existing.save()
                    else:
                        new_faculty.append({
                            "employee_id": emp_id,
                            "full_name": incoming_data.get('full_name')
                        })
                        if not preview_mode:
                            FacultyAcademicRegistry.objects.create(employee_id=emp_id, **incoming_data)
                            FacultyPreSeededRegistry.objects.get_or_create(identifier=emp_id, defaults={"email": incoming_data.get('email')})
                
                except Exception as e:
                    errors.append({"employee_id": emp_id, "error": str(e)})

        return success_response(
            "Preview generated" if preview_mode else "Faculty processing complete",
            data={
                "preview": preview_mode,
                "summary": {
                    "new_count": len(new_faculty),
                    "update_count": len(updates),
                    "error_count": len(errors)
                },
                "new_faculty": new_faculty if preview_mode else [],
                "updates": updates if preview_mode else [],
                "errors": errors
            }
        )

    def _clean_row(self, row):
        data = {
            "full_name": row.get('full_name', ''),
            "email": row.get('email', ''),
            "designation": row.get('designation', ''),
            "department": row.get('department', ''),
            "joining_date": row.get('joining_date') if row.get('joining_date') else None,
        }
        
        # 🧬 Governance Mapping
        try:
            from apps.academic.models import Department
            dept = Department.objects.filter(models.Q(code=data['department']) | models.Q(name=data['department'])).first()
            if dept:
                data['department_ref'] = dept
        except Exception as e:
            logger.warning(f"Faculty Department resolution failed: {e}")
            
        return data

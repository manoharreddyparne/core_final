from django.db import models
from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, JSONParser
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
    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        preview_mode = (
            request.data.get('preview', 'false').lower() == 'true'
            or request.data.get('preview') is True
        )
        
        # JSON Commit Support (from frontend DataGrid)
        if not preview_mode and 'faculty' in request.data:
            return self._commit_json(request, request.data['faculty'])

        if 'file' not in request.FILES:
            return error_response("CSV file required", code=400)

        csv_file = request.FILES['file']
        try:
            decoded = csv_file.read().decode('utf-8')
            rows = list(csv.DictReader(io.StringIO(decoded)))
        except Exception as e:
            return error_response(f"File process error: {str(e)}", code=400)
        
        if preview_mode:
            return self._preview(request, rows)
        else:
            return self._commit_csv(request, rows)

    def _preview(self, request, rows):
        institution = request.user.institution
        updates = []
        errors = []
        valid_records = []

        with schema_context(institution.schema_name):
            # Caches for O(1) lookups
            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            
            existing_ids = set(FacultyAcademicRegistry.objects.values_list('employee_id', flat=True))
            existing_objs = {
                obj.employee_id.lower(): obj 
                for obj in FacultyAcademicRegistry.objects.filter(
                    employee_id__in=[r.get('employee_id', '').strip() for r in rows if r.get('employee_id')]
                )
            }

            for row in rows:
                emp_id = row.get('employee_id', '').strip()
                if not emp_id: continue
                
                try:
                    incoming_data = self._clean_row(row, depts)
                    existing = existing_objs.get(emp_id.lower())
                    
                    if existing:
                        diff = {}
                        for key, val in incoming_data.items():
                            if key == 'department_ref': continue
                            old_val = getattr(existing, key, None)
                            if str(old_val) != str(val):
                                diff[key] = {"old": old_val, "new": val}
                        
                        updates.append({
                            "employee_id": emp_id,
                            "full_name": existing.full_name,
                            "diff": diff,
                            "is_new": False,
                            "is_unchanged": not bool(diff)
                        })
                    else:
                        updates.append({
                            "employee_id": emp_id,
                            "full_name": incoming_data.get('full_name'),
                            "is_new": True,
                            "diff": {},
                            "is_unchanged": False
                        })
                    valid_records.append(row)
                except Exception as e:
                    errors.append({"employee_id": emp_id, "error": str(e)})

        new_count = len([u for u in updates if u.get('is_new')])
        update_count = len([u for u in updates if not u.get('is_new')])

        return success_response("Preview generated", data={
            "preview": True,
            "summary": {
                "new_count": new_count,
                "update_count": update_count,
                "error_count": len(errors)
            },
            "updates": updates,
            "valid_records": valid_records,
            "errors": errors
        })

    def _commit_csv(self, request, rows):
        institution = request.user.institution
        with schema_context(institution.schema_name):
            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            
            created_count = 0
            errors = []
            
            with transaction.atomic():
                for row in rows:
                    emp_id = row.get('employee_id', '').strip()
                    if not emp_id: continue
                    try:
                        data = self._clean_row(row, depts)
                        obj, created = FacultyAcademicRegistry.objects.update_or_create(
                            employee_id=emp_id,
                            defaults=data
                        )
                        if created:
                            created_count += 1
                        FacultyPreSeededRegistry.objects.get_or_create(
                            identifier=emp_id, 
                            defaults={"email": data.get('email')}
                        )
                    except Exception as e:
                        errors.append({"employee_id": emp_id, "error": str(e)})

            return success_response("Faculty processing complete", data={
                "summary": {"new_count": created_count, "error_count": len(errors)},
                "errors": errors
            })

    def _commit_json(self, request, faculty_data):
        institution = request.user.institution
        with schema_context(institution.schema_name):
            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            created = 0
            errors = []
            with transaction.atomic():
                for row in faculty_data:
                    emp_id = row.get('employee_id', '').strip()
                    if not emp_id: continue
                    try:
                        data = self._clean_row(row, depts)
                        obj, is_new = FacultyAcademicRegistry.objects.update_or_create(
                            employee_id=emp_id,
                            defaults=data
                        )
                        if is_new: created += 1
                        FacultyPreSeededRegistry.objects.get_or_create(
                            identifier=emp_id, 
                            defaults={"email": data.get('email')}
                        )
                    except Exception as e:
                        errors.append({"employee_id": emp_id, "error": str(e)})
            return success_response("Faculty JSON commit complete", data={"new_count": created, "errors": errors})

    def _clean_row(self, row, dept_cache):
        data = {
            "full_name": row.get('full_name', '').strip(),
            "email": row.get('email', '').strip(),
            "designation": row.get('designation', '').strip(),
            "department": row.get('department', '').strip(),
            "joining_date": row.get('joining_date') if row.get('joining_date') else None,
        }
        
        dept_str = data['department'].lower()
        if dept_str in dept_cache:
            data['department_ref'] = dept_cache[dept_str]
            
        return data


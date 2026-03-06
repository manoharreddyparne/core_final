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
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

from apps.auip_institution.serializers import FacultyAcademicRegistrySerializer

def broadcast_bulk_progress(user, role, progress, message, action="bulk_upload_progress"):
    """Helper to send progress updates via WebSocket."""
    layer = get_channel_layer()
    if not layer:
        return
    
    group_name = f"user_sessions_{user.id}_{role}"
    try:
        async_to_sync(layer.group_send)(
            group_name,
            {
                "type": "session_update",
                "data": {
                    "action": action,
                    "progress": progress,
                    "message": message,
                    "phase": "COMMIT"
                }
            }
        )
    except Exception as e:
        logger.warning(f"Failed to broadcast progress: {e}")

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
        from apps.auip_institution.models import FacultyAuthorizedAccount
        from django.db.models import Exists, OuterRef
        institution = self.request.user.institution

        with schema_context(institution.schema_name):
            active_account_subquery = FacultyAuthorizedAccount.objects.filter(
                email=OuterRef('email')
            )
            qs = FacultyAcademicRegistry.objects.select_related('department_ref').annotate(
                is_active_account=Exists(active_account_subquery)
            )

            status_filter = self.request.query_params.get('status')
            if status_filter == 'ACTIVE':
                qs = qs.filter(is_active_account=True)
            elif status_filter == 'SEEDED':
                qs = qs.filter(is_active_account=False)

            return qs

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
            # Re-read with annotation for UI status
            instance.is_active_account = False 
            data = self.get_serializer(instance).data
            return success_response("Educator provisioned successfully", data=data)

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
            
            # Re-fetch with annotation
            updated_obj = self.get_queryset().get(id=instance.id)
            return success_response("Educator record updated", data=self.get_serializer(updated_obj).data)

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
            total = len(identifiers)
            broadcast_bulk_progress(request.user, "INST_ADMIN", 10, f"Initializing Signal Dispatch for {total} Educators...")
            
            import time
            for i, emp_id in enumerate(identifiers):
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
                    
                    # Periodic broadcast
                    if i % 5 == 0 or i == total - 1:
                        pct = 10 + int((i / total) * 85)
                        broadcast_bulk_progress(request.user, "INST_ADMIN", pct, f"Dispatching Link to {emp_id}...")
                    
                    # Slow down slightly for tiny batches to let animation breathe
                    if total < 10: time.sleep(0.3)

                except Exception as e:
                    logger.error(f"[FACULTY-INVITE] Failed for {emp_id}: {e}")
                    summary["failed"].append({"identifier": emp_id, "error": str(e)})

            broadcast_bulk_progress(request.user, "INST_ADMIN", 100, "All Activation Links Dispatched.")

        total_success = len(summary["invited"])
        return success_response(
            f"Successfully dispatched {total_success} activation signals.",
            data=summary
        )

BULK_FACULTY_FIELDS = [
    'full_name', 'email', 'personal_email', 'official_email',
    'designation', 'department', 'joining_date', 'department_ref',
]

class TenantBulkFacultyUploadView(APIView):
    """
    High-Speed Bulk Faculty Seeding with Real-time WebSocket Progress:
    - preview=true  → instant diff, zero writes
    - preview=false & faculty=[…] → commit from DataGrid (JSON)
    - preview=false & file → direct fast-commit from CSV
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]
    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        preview_val = request.data.get('preview', 'false')
        if isinstance(preview_val, bool):
            preview_mode = preview_val
        else:
            preview_mode = str(preview_val).lower() == 'true'
        
        # ── Route: DataGrid JSON commit ──────────────────────────────────────
        if not preview_mode and 'faculty' in request.data:
            return self._commit_json(request, request.data['faculty'])

        # ── Route: CSV file ──────────────────────────────────────────────────
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
            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            
            # FAST-PATH: empty check
            total_existing = FacultyAcademicRegistry.objects.count()
            if total_existing == 0:
                for row in rows:
                    emp_id = row.get('employee_id', '').strip()
                    if not emp_id: continue
                    try:
                        incoming = self._clean_row(row, depts)
                        updates.append({
                            "employee_id": emp_id,
                            "full_name": incoming.get('full_name'),
                            "is_new": True,
                            "diff": {},
                            "is_unchanged": False
                        })
                        valid_records.append(row)
                    except Exception as e:
                        errors.append({"employee_id": emp_id, "error": str(e)})
                
                return success_response("Preview generated (Fast Path)", data={
                    "preview": True,
                    "summary": {"new_count": len(updates), "update_count": 0, "error_count": len(errors)},
                    "updates": updates,
                    "valid_records": valid_records,
                    "invalid_records": errors,
                })

            # STANDARD-PATH: targeted load
            incoming_ids = {r.get('employee_id', '').strip().lower() for r in rows if r.get('employee_id')}
            existing_objs = {
                obj.employee_id.lower(): obj 
                for obj in FacultyAcademicRegistry.objects.filter(employee_id__in=list(incoming_ids))
            }

            for row in rows:
                emp_id = row.get('employee_id', '').strip()
                if not emp_id: continue
                
                try:
                    incoming = self._clean_row(row, depts)
                    existing = existing_objs.get(emp_id.lower())
                    
                    if existing:
                        diff = {
                            k: {"old": str(getattr(existing, k, None)), "new": str(v)}
                            for k, v in incoming.items()
                            if k in BULK_FACULTY_FIELDS and str(getattr(existing, k, None)) != str(v)
                        }
                        updates.append({
                            "employee_id": emp_id,
                            "full_name": incoming.get('full_name'),
                            "diff": diff,
                            "is_new": False,
                            "is_unchanged": not bool(diff)
                        })
                    else:
                        updates.append({
                            "employee_id": emp_id,
                            "full_name": incoming.get('full_name'),
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
            "summary": {"new_count": new_count, "update_count": update_count, "error_count": len(errors)},
            "updates": updates,
            "valid_records": valid_records,
            "invalid_records": errors,
        })

    def _commit_csv(self, request, rows):
        """Direct CSV commit - extreme speed"""
        user = request.user
        role = getattr(user, 'role', 'INSTITUTION_ADMIN')
        broadcast_bulk_progress(user, role, 10, "Initializing Registry Protocol...")

        institution = request.user.institution
        errors = []
        with schema_context(institution.schema_name):
            # Ensure departments
            incoming_dept_codes = {r.get('department', '').strip() for r in rows if r.get('department')}
            for code in incoming_dept_codes:
                Department.objects.get_or_create(code=code, defaults={"name": f"Department of {code}"})

            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            
            existing_ids = set(FacultyAcademicRegistry.objects.values_list('employee_id', flat=True))
            existing_preseeded = set(FacultyPreSeededRegistry.objects.values_list('identifier', flat=True))
            
            new_objs = []
            new_preseeded = []
            
            total = len(rows)
            for i, row in enumerate(rows):
                emp_id = row.get('employee_id', '').strip()
                if not emp_id: continue
                try:
                    data = self._clean_row(row, depts)
                    if emp_id not in existing_ids:
                        new_objs.append(FacultyAcademicRegistry(employee_id=emp_id, **data))
                        if emp_id not in existing_preseeded:
                            new_preseeded.append(FacultyPreSeededRegistry(identifier=emp_id, email=data.get('email')))
                except Exception as e:
                    errors.append({"employee_id": emp_id, "error": str(e)})
                
                if i % 100 == 0:
                    pct = 20 + int((i / total) * 60)
                    broadcast_bulk_progress(user, role, pct, f"Indexing Educator {i}/{total}...")

            with transaction.atomic():
                created = 0
                broadcast_bulk_progress(user, role, 85, "Executing Atomic Batch Write...")
                if new_objs:
                    res = FacultyAcademicRegistry.objects.bulk_create(new_objs, ignore_conflicts=True)
                    created = len(res)
                if new_preseeded:
                    FacultyPreSeededRegistry.objects.bulk_create(new_preseeded, ignore_conflicts=True)

        broadcast_bulk_progress(user, role, 100, "Registry Commitment Successful.")
        return success_response("Faculty processing complete", data={
            "summary": {"new_count": created, "update_count": 0, "error_count": len(errors)},
            "errors": errors
        })

    def _commit_json(self, request, faculty_data):
        """DataGrid commit with updates support and real-time progress"""
        user = request.user
        role = getattr(user, 'role', 'INSTITUTION_ADMIN')
        broadcast_bulk_progress(user, role, 10, "Opening Synchronization Channel...")

        institution = request.user.institution
        errors = []
        with schema_context(institution.schema_name):
            # Ensure departments
            incoming_dept_codes = {r.get('department', '').strip() for r in faculty_data if r.get('department')}
            for code in incoming_dept_codes:
                Department.objects.get_or_create(code=code, defaults={"name": f"Department of {code}"})

            depts = {d.code.lower(): d for d in Department.objects.all()}
            depts.update({d.name.lower(): d for d in Department.objects.all()})
            
            incoming_ids = [str(r.get('employee_id', '')).strip() for r in faculty_data if r.get('employee_id')]
            existing_map = {
                obj.employee_id.lower(): obj 
                for obj in FacultyAcademicRegistry.objects.filter(employee_id__in=incoming_ids)
            }
            existing_preseeded = set(FacultyPreSeededRegistry.objects.values_list('identifier', flat=True))
            
            new_objs = []
            update_objs = []
            new_preseeded = []

            total = len(faculty_data)
            for i, row in enumerate(faculty_data):
                emp_id = str(row.get('employee_id', '')).strip()
                if not emp_id or row.get('_status') == 'INVALID': continue
                try:
                    data = self._clean_row(row, depts)
                    existing = existing_map.get(emp_id.lower())
                    if existing:
                        for k, v in data.items(): setattr(existing, k, v)
                        update_objs.append(existing)
                    else:
                        new_objs.append(FacultyAcademicRegistry(employee_id=emp_id, **data))
                        if emp_id not in existing_preseeded:
                            new_preseeded.append(FacultyPreSeededRegistry(identifier=emp_id, email=data.get('email')))
                except Exception as e:
                    errors.append({"employee_id": emp_id, "error": str(e)})

                if i % 50 == 0:
                    pct = 20 + int((i / total) * 50)
                    broadcast_bulk_progress(user, role, pct, f"Merging Identity {i}/{total}...")

            with transaction.atomic():
                created = updated = 0
                broadcast_bulk_progress(user, role, 80, "Applying Global Changes...")
                if new_objs:
                    res = FacultyAcademicRegistry.objects.bulk_create(new_objs, ignore_conflicts=True)
                    created = len(res)
                if update_objs:
                    FacultyAcademicRegistry.objects.bulk_update(update_objs, fields=BULK_FACULTY_FIELDS, batch_size=200)
                    updated = len(update_objs)
                if new_preseeded:
                    FacultyPreSeededRegistry.objects.bulk_create(new_preseeded, ignore_conflicts=True)

        broadcast_bulk_progress(user, role, 100, "Registry Sync Complete.")
        return success_response("Faculty processing complete", data={
            "summary": {"new_count": created, "update_count": updated, "error_count": len(errors)},
            "errors": errors,
        })


    def _clean_row(self, row, dept_cache):
        data = {
            "full_name": row.get('full_name', '').strip(),
            "email": row.get('email', '').strip(),
            "personal_email": row.get('personal_email', '').strip(),
            "official_email": row.get('official_email', '').strip(),
            "designation": row.get('designation', '').strip(),
            "department": row.get('department', '').strip(),
            "joining_date": row.get('joining_date') if row.get('joining_date') else None,
        }
        
        # If email is empty but official/personal is provided, populate it
        if not data['email']:
            data['email'] = data['official_email'] or data['personal_email']
            
        dept_str = data['department'].lower()
        if dept_str in dept_cache:
            data['department_ref'] = dept_cache[dept_str]
            
        return data

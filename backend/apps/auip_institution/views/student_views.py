from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
import logging
import csv
import io
from django.utils import timezone
from datetime import datetime

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
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['roll_number', 'full_name', 'official_email', 'branch', 'section']
    ordering_fields = ['roll_number', 'full_name', 'batch_year', 'section', 'current_semester']

    def get_queryset(self):
        from apps.auip_institution.models import StudentAcademicRegistry
        from django_tenants.utils import schema_context
        institution = self.request.user.institution
        
        with schema_context(institution.schema_name):
            qs = StudentAcademicRegistry.objects.all()
            # Dynamic Filter by Section if provided
            section = self.request.query_params.get('section')
            if section:
                qs = qs.filter(section=section)
            return qs

    def create(self, request, *args, **kwargs):
        from apps.auip_institution.models import StudentAcademicRegistry
        from django.db import models
        roll_number = request.data.get('roll_number')
        official_email = request.data.get('official_email')
        
        # Check for existing student in this tenant context
        existing = StudentAcademicRegistry.objects.filter(
            models.Q(roll_number=roll_number) | models.Q(official_email=official_email)
        ).first()
        
        if existing:
            return Response({
                "success": False,
                "code": "DUPLICATE_IDENTITY",
                "message": f"Identity Conflict: {roll_number} already exists in the registry.",
                "student": {
                    "id": existing.id,
                    "roll_number": existing.roll_number,
                    "full_name": existing.full_name
                }
            }, status=status.HTTP_400_BAD_REQUEST)
            
        return super().create(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return success_response("Students retrieved successfully", data=serializer.data)

    @action(detail=False, methods=['get'])
    def sections(self, request):
        """Get unique sections and student counts for card view"""
        from django.db.models import Count
        from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry
        
        # Aggregate stats per section
        sections_data = StudentAcademicRegistry.objects.values('section').annotate(
            total_students=Count('id')
        ).order_by('section')
        
        results = []
        for item in sections_data:
            section_name = item['section']
            if not section_name: continue
            
            # Count activated students in Table 2 for this section
            rolls = StudentAcademicRegistry.objects.filter(section=section_name).values_list('roll_number', flat=True)
            activated_count = StudentPreSeededRegistry.objects.filter(identifier__in=rolls, is_activated=True).count()
            
            results.append({
                "name": section_name,
                "total": item['total_students'],
                "activated": activated_count,
            })
            
        return Response(results)

    @action(detail=False, methods=['post'])
    def bulk_invite(self, request):
        """Trigger activation links for multiple students or entire sections."""
        roll_numbers = request.data.get('roll_numbers', [])
        section = request.data.get('section')
        
        from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
        from apps.identity.services.activation_service import ActivationService
        from django_tenants.utils import schema_context
        
        institution = request.user.institution
        summary = {
            "invited": [],
            "already_activated": [],
            "not_found": [],
            "failed": []
        }
        
        # 🧪 Human-friendly normalization (strip whitespace)
        normalized_rolls = [str(r).strip() for r in roll_numbers if r]
        
        with schema_context(institution.schema_name):
            # 🔍 Determine Target Population
            if section:
                rolls_in_section = StudentAcademicRegistry.objects.filter(section=section).values_list('roll_number', flat=True)
                query_rolls = list(rolls_in_section)
            elif normalized_rolls:
                query_rolls = normalized_rolls
            else:
                return error_response("Target selection required (Roll Numbers or Section)", code=400)

            # 🚀 Process
            found_rolls = set()
            for roll in query_rolls:
                try:
                    # 🔍 Case-Insensitive Lookup
                    stu = StudentPreSeededRegistry.objects.filter(identifier__iexact=roll).first()
                    if not stu:
                        summary["not_found"].append(roll)
                        continue
                    
                    found_rolls.add(roll.upper()) # Track using upper for set logic
                    
                    if stu.is_activated:
                        summary["already_activated"].append(roll)
                        continue
                        
                    ActivationService.create_tenant_invitation(stu, institution.schema_name, entry_type="student")
                    summary["invited"].append(roll)
                    
                except Exception as e:
                    logger.error(f"Invite failed for {roll}: {e}")
                    summary["failed"].append({"roll": roll, "error": str(e)})

            # 🔎 Identify rolls that were completely missing if specifically requested
            if normalized_rolls:
                missing = set(normalized_rolls) - found_rolls - set(summary["not_found"])
                summary["not_found"].extend(list(missing))

        invited_count = len(summary["invited"])
        msg = f"Dispatched {invited_count} activation signals."
        if summary["already_activated"]:
            msg += f" {len(summary['already_activated'])} were already active."
        if summary["not_found"]:
            msg += f" {len(summary['not_found'])} records not found."

        return success_response(msg, data=summary)

    @action(detail=False, methods=['get'])
    def activation_stats(self, request):
        """Get graphical/stat data for student activations."""
        from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
        from django_tenants.utils import schema_context
        institution = request.user.institution
        
        with schema_context(institution.schema_name):
            total = StudentPreSeededRegistry.objects.count()
            activated = StudentPreSeededRegistry.objects.filter(is_activated=True).count()
            
            # Section-wise breakdown
            stats = []
            sections = StudentAcademicRegistry.objects.values_list('section', flat=True).distinct()
            for sec in sections:
                if not sec: continue
                sec_rolls = StudentAcademicRegistry.objects.filter(section=sec).values_list('roll_number', flat=True)
                sec_activated = StudentPreSeededRegistry.objects.filter(identifier__in=sec_rolls, is_activated=True).count()
                stats.append({
                    "section": sec,
                    "total": len(sec_rolls),
                    "activated": sec_activated
                })

            return success_response("Activation stats retrieved", data={
                "overall": {"total": total, "activated": activated},
                "section_wise": stats
            })

class TenantBulkStudentUploadView(APIView):
    """
    Hardware Seeding logic with Preview/Diff support.
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
        
        from django.db import transaction
        from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry
        from django_tenants.utils import schema_context
        
        institution = request.user.institution
        new_students = []
        updates = []
        errors = []

        with schema_context(institution.schema_name), transaction.atomic():
            # 🏎️ Faster execution: wrap in atomic transaction
            for row in reader:
                roll = row.get('roll_number', '').strip()
                if not roll: continue
                
                try:
                    # Case-insensitive robust lookup
                    existing = StudentAcademicRegistry.objects.filter(roll_number__iexact=roll).first()
                    incoming_data = self._clean_row(row)
                    
                    if existing:
                        # 🔍 Compute Diff
                        diff = {}
                        for key, val in incoming_data.items():
                            old_val = getattr(existing, key, None)
                            
                            # Type-aware comparison to prevent false positives (e.g. 9.5 vs 9.50)
                            if key == 'history_data':
                                if isinstance(old_val, dict) and isinstance(val, dict):
                                    # Simple dict comparison
                                    if old_val.get('10th_percent') != val.get('10th_percent') or \
                                       old_val.get('12th_percent') != val.get('12th_percent') or \
                                       old_val.get('active_backlogs') != val.get('active_backlogs'):
                                        diff[key] = {"old": "Past Data", "new": "Updated JSON"}
                                continue

                            if isinstance(val, (int, float, type(None))) or str(type(val)).find('Decimal') != -1:
                                if old_val != val:
                                    diff[key] = {"old": str(old_val), "new": str(val)}
                            else:
                                if str(old_val).strip() != str(val).strip():
                                    diff[key] = {"old": str(old_val), "new": str(val)}
                        
                        if diff:
                            updates.append({
                                "roll_number": roll,
                                "full_name": existing.full_name,
                                "diff": diff
                            })
                            if not preview_mode:
                                for key, val in incoming_data.items():
                                    setattr(existing, key, val)
                                existing.save()
                    else:
                        new_students.append({
                            "roll_number": roll,
                            "full_name": incoming_data.get('full_name')
                        })
                        if not preview_mode:
                            StudentAcademicRegistry.objects.create(roll_number=roll, **incoming_data)
                            StudentPreSeededRegistry.objects.get_or_create(identifier=roll, defaults={"email": incoming_data.get('official_email')})
                
                except Exception as e:
                    errors.append({"roll": roll or "Unknown", "error": str(e)})

        return success_response(
            "Preview generated" if preview_mode else "Student processing complete",
            data={
                "preview": preview_mode,
                "summary": {
                    "new_count": len(new_students),
                    "update_count": len(updates),
                    "error_count": len(errors)
                },
                "new_students": new_students if preview_mode else [],
                "updates": updates if preview_mode else [],
                "errors": errors
            }
        )

    def _clean_row(self, row):
        """Standardize row data for model comparison/saving."""
        from decimal import Decimal, InvalidOperation
        
        def to_decimal(val):
            try: return Decimal(str(val))
            except (InvalidOperation, ValueError, TypeError): return Decimal('0.00')

        def to_int_or_none(val):
            try: return int(val) if val and str(val).strip().isdigit() else None
            except: return None

        def to_date_or_none(val):
            from datetime import date
            if not val or not str(val).strip(): return None
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
                try:
                    from datetime import datetime
                    return datetime.strptime(str(val).strip(), fmt).date()
                except: pass
            return None

        return {
            "full_name": row.get('full_name', 'Unknown Student').strip(),
            "official_email": row.get('official_email', '').strip(),
            "personal_email": row.get('personal_email', '').strip() or None,
            "phone_number": row.get('phone_number', '').strip() or None,
            "program": row.get('program', 'B.Tech').strip(),
            "branch": row.get('branch', 'CSE').strip(),
            "batch_year": int(row.get('batch_year')) if row.get('batch_year') and str(row.get('batch_year')).strip().isdigit() else timezone.now().year,
            "admission_year": to_int_or_none(row.get('admission_year')),
            "passout_year": to_int_or_none(row.get('passout_year')),
            "section": row.get('section', 'A').strip(),
            "cgpa": to_decimal(row.get('cgpa')) if row.get('cgpa') else Decimal('0.00'),
            "current_semester": int(row.get('current_semester')) if row.get('current_semester') and str(row.get('current_semester')).strip().isdigit() else 1,
            "date_of_birth": to_date_or_none(row.get('date_of_birth')),
            "history_data": {
                "10th_percent": float(row.get("10th_percent", 0)) if str(row.get("10th_percent", "")).replace(".","",1).isdigit() else 0.0,
                "12th_percent": float(row.get("12th_percent", 0)) if str(row.get("12th_percent", "")).replace(".","",1).isdigit() else 0.0,
                "active_backlogs": int(float(row.get("active_backlogs", 0))) if str(row.get("active_backlogs", "")).replace(".","",1).isdigit() else 0,
            }
        }

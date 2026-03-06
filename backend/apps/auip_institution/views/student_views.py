# apps/auip_institution/views/student_views.py
# RegisteredStudentViewSet — CRUD + sections + bulk_invite + activation_stats
# ─────────────────────────────────────────────────────────────────────────────
import logging

from django.db.models import Count, Q, Subquery, IntegerField, Value
from django.db.models.functions import Coalesce
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)


class StudentPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 2000


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
        from apps.auip_institution.models import StudentAcademicRegistry, StudentAuthorizedAccount
        from django.db.models import Exists, OuterRef
        from django_tenants.utils import schema_context
        institution = self.request.user.institution

        with schema_context(institution.schema_name):
            active_account_subquery = StudentAuthorizedAccount.objects.filter(
                email=OuterRef('official_email')
            )
            qs = StudentAcademicRegistry.objects.select_related(
                'program_ref', 'department_ref', 'section_ref', 'semester_ref'
            ).annotate(
                is_active_account=Exists(active_account_subquery)
            )

            # 🔍 Apply Filters INSIDE schema context
            section = self.request.query_params.get('section')
            status_filter = self.request.query_params.get('status')

            if section:
                qs = qs.filter(section=section)

            if status_filter == 'ACTIVE':
                qs = qs.filter(is_active_account=True)
            elif status_filter == 'SEEDED':
                qs = qs.filter(is_active_account=False)

            return qs

    def create(self, request, *args, **kwargs):
        from apps.auip_institution.models import StudentAcademicRegistry
        roll_number = request.data.get('roll_number')
        official_email = request.data.get('official_email')

        existing = StudentAcademicRegistry.objects.filter(
            Q(roll_number=roll_number) | Q(official_email=official_email)
        ).first()

        if existing:
            return Response({
                "success": False,
                "code": "DUPLICATE_IDENTITY",
                "message": f"Identity Conflict: {roll_number} already exists in the registry.",
                "student": {
                    "id": existing.id,
                    "roll_number": existing.roll_number,
                    "full_name": existing.full_name,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        return super().create(request, *args, **kwargs)

    pagination_class = StudentPagination

    def list(self, request, *args, **kwargs):
        """Ensure the entire list process (filtering, pagination, serialization) runs in tenant schema."""
        from django_tenants.utils import schema_context
        institution = self.request.user.institution
        with schema_context(institution.schema_name):
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = self.get_serializer(queryset, many=True)
            return success_response("Students retrieved successfully", data=serializer.data)

    @action(detail=False, methods=['get'])
    def sections(self, request):
        """Get unique sections and student counts for stats cards."""
        from apps.auip_institution.models import StudentAcademicRegistry, StudentAuthorizedAccount
        from django_tenants.utils import schema_context
        institution = self.request.user.institution

        with schema_context(institution.schema_name):
            sections_qs = (
                StudentAcademicRegistry.objects
                .exclude(section__isnull=True).exclude(section='')
                .values('section').annotate(total=Count('id')).order_by('section')
            )
            # Use official authorized accounts for activation status
            active_emails = set(StudentAuthorizedAccount.objects.values_list('email', flat=True))
            results = []
            for item in sections_qs:
                name = item['section']
                emails = StudentAcademicRegistry.objects.filter(section=name).values_list('official_email', flat=True)
                results.append({
                    "name": name,
                    "total": item['total'],
                    "activated": sum(1 for e in emails if e in active_emails)
                })
            return success_response("Section stats retrieved successfully", data=results)

    @action(detail=False, methods=['post'])
    def bulk_invite(self, request):
        """
        High-performance bulk invite using:
        - 2 bulk DB queries (no N+1 loop)
        - Parallel email dispatch via ThreadPoolExecutor
        - Auto-sync missing identity entries from academic registry
        Target: 1000 students in <60s (vs 16+ minutes serial)
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
        from apps.identity.services.activation_service import ActivationService
        from django_tenants.utils import schema_context

        roll_numbers = request.data.get('roll_numbers', [])
        section = request.data.get('section')
        institution = request.user.institution
        schema = institution.schema_name
        summary = {"invited": [], "already_activated": [], "not_found": [], "failed": []}
        normalized_rolls = [str(r).strip().upper() for r in roll_numbers if r]

        with schema_context(schema):
            # ── Step 1: Resolve target rolls (single query) ──────────────────
            if section:
                query_rolls = list(
                    StudentAcademicRegistry.objects
                    .filter(section=section)
                    .values_list('roll_number', flat=True)
                )
            elif normalized_rolls:
                query_rolls = normalized_rolls
            else:
                return error_response("Target selection required (Roll Numbers or Section)", code=400)

            if not query_rolls:
                return success_response("No target students found.", data=summary)

            # ── Step 2: Bulk load all PreSeeded entries in ONE query ──────────
            preseeded_map = {
                s.identifier.upper(): s
                for s in StudentPreSeededRegistry.objects.filter(
                    identifier__in=query_rolls
                )
            }

            # ── Step 3: Detect missing and bulk-auto-sync them ───────────────
            missing_rolls = [r for r in query_rolls if r.upper() not in preseeded_map]
            if missing_rolls:
                academic_missing = StudentAcademicRegistry.objects.filter(
                    roll_number__in=missing_rolls
                )
                for acad in academic_missing:
                    try:
                        acad.sync_to_preseeded()
                    except Exception as se:
                        logger.warning(f"[BULK-INVITE] Sync failed for {acad.roll_number}: {se}")

                # Re-fetch newly synced entries
                if academic_missing.exists():
                    new_entries = StudentPreSeededRegistry.objects.filter(
                        identifier__in=missing_rolls
                    )
                    for s in new_entries:
                        preseeded_map[s.identifier.upper()] = s

            # ── Step 4: Classify rolls ───────────────────────────────────────
            to_invite = []
            for roll in query_rolls:
                stu = preseeded_map.get(roll.upper())
                if not stu:
                    summary["not_found"].append(roll)
                elif stu.is_activated:
                    summary["already_activated"].append(roll)
                else:
                    to_invite.append(stu)

            logger.info(
                f"[BULK-INVITE] schema={schema} | target={len(query_rolls)} | "
                f"to_invite={len(to_invite)} | activated={len(summary['already_activated'])} | "
                f"not_found={len(summary['not_found'])}"
            )

            # ── Step 5: Dispatch emails in parallel ──────────────────────────
            # Max 20 workers: balanced for SMTP connection pool limits
            MAX_WORKERS = min(20, max(1, len(to_invite)))

            def _send_one(stu_entry):
                """Worker function — runs in thread pool."""
                try:
                    ActivationService.create_tenant_invitation(
                        stu_entry, schema, entry_type="student"
                    )
                    return ("invited", stu_entry.identifier)
                except Exception as e:
                    logger.error(f"[BULK-INVITE] Failed for {stu_entry.identifier}: {e}")
                    return ("failed", {"roll": stu_entry.identifier, "error": str(e)})

            if to_invite:
                with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                    futures = {pool.submit(_send_one, stu): stu for stu in to_invite}
                    for future in as_completed(futures):
                        result_type, payload = future.result()
                        summary[result_type].append(payload)

        invited_count = len(summary["invited"])
        msg = f"Dispatched {invited_count} activation signals."
        if summary["already_activated"]:
            msg += f" {len(summary['already_activated'])} already active."
        if summary["not_found"]:
            msg += f" {len(summary['not_found'])} not found."
        if summary["failed"]:
            msg += f" {len(summary['failed'])} failed."
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
            stats = []
            for sec in StudentAcademicRegistry.objects.values_list('section', flat=True).distinct():
                if not sec:
                    continue
                sec_rolls = StudentAcademicRegistry.objects.filter(section=sec).values_list('roll_number', flat=True)
                sec_activated = StudentPreSeededRegistry.objects.filter(identifier__in=sec_rolls, is_activated=True).count()
                stats.append({"section": sec, "total": len(sec_rolls), "activated": sec_activated})

        return success_response("Activation stats retrieved", data={
            "overall": {"total": total, "activated": activated},
            "section_wise": stats,
        })

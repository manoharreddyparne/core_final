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
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


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
            
            section = self.request.query_params.get('section')
            if section:
                qs = qs.filter(section=section)
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
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response("Students retrieved successfully", data=serializer.data)

    @action(detail=False, methods=['get'])
    def sections(self, request):
        """Get unique sections and student counts for card view — single query."""
        from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry

        # Build activated-roll set once (single query)
        activated_rolls = set(
            StudentPreSeededRegistry.objects
            .filter(is_activated=True)
            .values_list('identifier', flat=True)
        )

        sections_data = (
            StudentAcademicRegistry.objects
            .exclude(section__isnull=True)
            .exclude(section='')
            .values('section')
            .annotate(total_students=Count('id'))
            .order_by('section')
        )

        # For activated counts per section, do one bulk query
        section_rolls = {}
        for row in StudentAcademicRegistry.objects.exclude(section__isnull=True).exclude(section='').values_list('section', 'roll_number'):
            section_rolls.setdefault(row[0], []).append(row[1])

        results = []
        for item in sections_data:
            sec = item['section']
            rolls = section_rolls.get(sec, [])
            activated_count = sum(1 for r in rolls if r in activated_rolls)
            results.append({"name": sec, "total": item['total_students'], "activated": activated_count})
        return Response(results)

    @action(detail=False, methods=['post'])
    def bulk_invite(self, request):
        """Trigger activation links for multiple students or entire sections."""
        from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
        from apps.identity.services.activation_service import ActivationService
        from django_tenants.utils import schema_context

        roll_numbers = request.data.get('roll_numbers', [])
        section = request.data.get('section')
        institution = request.user.institution
        summary = {"invited": [], "already_activated": [], "not_found": [], "failed": []}
        normalized_rolls = [str(r).strip() for r in roll_numbers if r]

        with schema_context(institution.schema_name):
            if section:
                query_rolls = list(StudentAcademicRegistry.objects.filter(section=section).values_list('roll_number', flat=True))
            elif normalized_rolls:
                query_rolls = normalized_rolls
            else:
                return error_response("Target selection required (Roll Numbers or Section)", code=400)

            found_rolls = set()
            for roll in query_rolls:
                try:
                    # 🔍 Step 1: Check Identity Registry
                    stu = StudentPreSeededRegistry.objects.filter(identifier__iexact=roll).first()
                    
                    # 🛠️ Hub Resilience: If missing from identity registry but exists in academic registry, sync now
                    if not stu:
                        academic_stu = StudentAcademicRegistry.objects.filter(roll_number__iexact=roll).first()
                        if academic_stu:
                            logger.info(f"[BULK-INVITE] Auto-syncing missing identity for {roll}")
                            academic_stu.sync_to_preseeded()
                            stu = StudentPreSeededRegistry.objects.filter(identifier__iexact=roll).first()
                    
                    if not stu:
                        summary["not_found"].append(roll)
                        continue
                        
                    found_rolls.add(roll.upper())
                    if stu.is_activated:
                        summary["already_activated"].append(roll)
                        continue
                        
                    ActivationService.create_tenant_invitation(stu, institution.schema_name, entry_type="student")
                    summary["invited"].append(roll)
                except Exception as e:
                    logger.error(f"Invite failed for {roll}: {e}")
                    summary["failed"].append({"roll": roll, "error": str(e)})

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

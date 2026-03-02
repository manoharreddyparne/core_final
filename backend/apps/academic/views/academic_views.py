# apps/academic/views/academic_views.py
# Department, AcademicProgram, AcademicYear, Semester, Subject, SyllabusUnit ViewSets
import logging
from rest_framework import viewsets, permissions
from rest_framework.decorators import action

from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

from apps.academic.models import Department, AcademicProgram, AcademicYear, Semester, Subject, SyllabusUnit
from apps.academic.serializers import (
    DepartmentSerializer, AcademicProgramSerializer, AcademicYearSerializer,
    SemesterSerializer, SubjectSerializer, SubjectListSerializer, SyllabusUnitSerializer,
)
from ._permissions import AdminWriteAuthReadMixin, IsTenantFacultyOrAdmin

logger = logging.getLogger(__name__)


class DepartmentViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    """Admin-only CRUD for departments. Students/Faculty: read-only."""
    authentication_classes = [TenantAuthentication]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response("Departments retrieved", data=serializer.data)


class AcademicProgramViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = AcademicProgramSerializer

    def get_queryset(self):
        qs = AcademicProgram.objects.select_related('department').filter(is_active=True)
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department__code=dept)
        return qs

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response("Programs retrieved", data=serializer.data)


class AcademicYearViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = AcademicYearSerializer
    queryset = AcademicYear.objects.all()

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Returns the currently active academic year."""
        year = AcademicYear.objects.filter(is_current=True).first()
        if not year:
            return error_response("No current academic year configured", code=404)
        return success_response("Current academic year", data=AcademicYearSerializer(year).data)


class SemesterViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = SemesterSerializer

    def get_queryset(self):
        qs = Semester.objects.select_related('program', 'academic_year')
        params = self.request.query_params
        if params.get('program'):
            qs = qs.filter(program__code=params['program'])
        if params.get('year'):
            qs = qs.filter(academic_year__label=params['year'])
        if params.get('status'):
            qs = qs.filter(status=params['status'])
        return qs


class SubjectViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    """Full subject management. Includes placement-tagged subjects for exam auto-generation."""
    authentication_classes = [TenantAuthentication]

    def get_serializer_class(self):
        return SubjectListSerializer if self.action == 'list' else SubjectSerializer

    def get_queryset(self):
        qs = Subject.objects.select_related('department', 'program').prefetch_related('syllabus_units')
        params = self.request.query_params
        if params.get('department'):
            qs = qs.filter(department__code=params['department'])
        if params.get('program'):
            qs = qs.filter(program__code=params['program'])
        if params.get('semester'):
            qs = qs.filter(semester_number=params['semester'])
        if params.get('placement') == 'true':
            qs = qs.filter(is_placement_relevant=True)
        if params.get('active') != 'false':
            qs = qs.filter(is_active=True)
        return qs

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response("Subjects retrieved", data=serializer.data)

    @action(detail=False, methods=['get'])
    def placement_subjects(self, request):
        """Returns all placement-relevant subjects with their tags. Used by exam engine."""
        qs = Subject.objects.filter(is_placement_relevant=True, is_active=True)
        return success_response("Placement-relevant subjects", data=SubjectListSerializer(qs, many=True).data)

    @action(detail=True, methods=['post'])
    def add_syllabus_unit(self, request, pk=None):
        """Add a unit to a subject's syllabus."""
        subject = self.get_object()
        data = {**request.data, 'subject': subject.id}
        serializer = SyllabusUnitSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return success_response("Syllabus unit added", data=serializer.data)
        return error_response("Validation error", code=400, extra=serializer.errors)


class SyllabusUnitViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = SyllabusUnitSerializer

    def get_queryset(self):
        qs = SyllabusUnit.objects.select_related('subject')
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantFacultyOrAdmin()]
        return [permissions.IsAuthenticated()]

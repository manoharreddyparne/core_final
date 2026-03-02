# apps/academic/views/section_views.py
# ClassSection, TeacherAssignment, StudentEnrollment ViewSets
import logging
from django.db import transaction
from django.db.models import Count
from rest_framework import viewsets, permissions
from rest_framework.decorators import action

from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response

from apps.academic.models import ClassSection, TeacherAssignment, StudentEnrollment, Subject, Semester
from apps.academic.serializers import (
    ClassSectionSerializer, TeacherAssignmentSerializer, StudentEnrollmentSerializer
)
from ._permissions import AdminWriteAuthReadMixin

logger = logging.getLogger(__name__)


class ClassSectionViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = ClassSectionSerializer

    def get_queryset(self):
        qs = ClassSection.objects.select_related('program', 'academic_year').annotate(
            _enrolled_count=Count('enrollments')
        )
        params = self.request.query_params
        if params.get('program'):
            qs = qs.filter(program__code=params['program'])
        if params.get('year'):
            qs = qs.filter(academic_year__label=params['year'])
        if params.get('semester'):
            qs = qs.filter(semester_number=params['semester'])
        return qs


class TeacherAssignmentViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = TeacherAssignmentSerializer

    def get_queryset(self):
        qs = TeacherAssignment.objects.select_related('subject', 'section', 'academic_year', 'semester')
        role = getattr(self.request.user, 'role', '')
        if role == 'FACULTY':
            employee_id = getattr(self.request.user.academic_ref, 'employee_id', None) \
                if hasattr(self.request.user, 'academic_ref') else None
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
        if self.request.query_params.get('year'):
            qs = qs.filter(academic_year__label=self.request.query_params['year'])
        return qs

    @action(detail=False, methods=['get'])
    def my_subjects(self, request):
        """Faculty: Get all subjects I'm assigned to teach."""
        if getattr(request.user, 'role', '') != 'FACULTY':
            return error_response("Only faculty can access this endpoint", code=403)
        employee_id = getattr(request.user.academic_ref, 'employee_id', None) \
            if hasattr(request.user, 'academic_ref') else None
        if not employee_id:
            return error_response("Faculty academic record not linked", code=400)
        assignments = TeacherAssignment.objects.filter(employee_id=employee_id).select_related('subject', 'academic_year')
        return success_response("Your subject assignments", data=self.get_serializer(assignments, many=True).data)


class StudentEnrollmentViewSet(AdminWriteAuthReadMixin, viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = StudentEnrollmentSerializer

    def get_queryset(self):
        qs = StudentEnrollment.objects.select_related('subject', 'section', 'semester')
        role = getattr(self.request.user, 'role', '')
        if role == 'STUDENT':
            roll = getattr(self.request.user.academic_ref, 'roll_number', None) \
                if hasattr(self.request.user, 'academic_ref') else None
            if roll:
                qs = qs.filter(roll_number=roll)
        params = self.request.query_params
        if params.get('roll_number'):
            qs = qs.filter(roll_number=params['roll_number'])
        if params.get('subject'):
            qs = qs.filter(subject__code=params['subject'])
        if params.get('semester'):
            qs = qs.filter(semester_id=params['semester'])
        return qs

    @action(detail=False, methods=['post'])
    def bulk_enroll(self, request):
        """
        Bulk enroll students from a list of roll numbers into a subject/semester.
        Expected: {subject_id, semester_id, section_id, students: [{roll_number, student_name}]}
        """
        subject_id = request.data.get('subject_id')
        semester_id = request.data.get('semester_id')
        section_id = request.data.get('section_id')
        students = request.data.get('students', [])

        if not all([subject_id, semester_id, students]):
            return error_response("subject_id, semester_id, and students are required")

        try:
            subject = Subject.objects.get(id=subject_id)
            semester = Semester.objects.get(id=semester_id)
        except (Subject.DoesNotExist, Semester.DoesNotExist):
            return error_response("Subject or Semester not found", code=404)

        created_count = 0
        skipped = []
        with transaction.atomic():
            for s in students:
                roll = s.get('roll_number')
                name = s.get('student_name', '')
                if not roll:
                    continue
                _, created = StudentEnrollment.objects.get_or_create(
                    roll_number=roll, subject=subject, semester=semester,
                    defaults={'student_name': name, 'section_id': section_id, 'status': 'ACTIVE'}
                )
                if created:
                    created_count += 1
                else:
                    skipped.append(roll)

        return success_response(
            f"Bulk enrollment complete: {created_count} enrolled, {len(skipped)} skipped (already enrolled)",
            data={'enrolled': created_count, 'skipped': skipped}
        )

    @action(detail=False, methods=['get'])
    def my_subjects(self, request):
        """Student: Get my current enrolled subjects."""
        if getattr(request.user, 'role', '') != 'STUDENT':
            return error_response("Only students can access this endpoint", code=403)
        roll = getattr(request.user.academic_ref, 'roll_number', None) \
            if hasattr(request.user, 'academic_ref') else None
        if not roll:
            return error_response("Student academic record not linked")
        enrollments = StudentEnrollment.objects.filter(roll_number=roll, status='ACTIVE').select_related('subject', 'semester')
        return success_response("Your enrolled subjects", data=self.get_serializer(enrollments, many=True).data)

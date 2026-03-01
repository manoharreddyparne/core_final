# apps/academic/views.py
# Full Academic Management ViewSets
# All ViewSets use TenantAuthentication — data is scoped per institution schema
# ─────────────────────────────────────────────────────────────────────────────
import logging
from django.db import transaction
from django.db.models import Avg, Count, Q
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

from .models import (
    Department, AcademicProgram, AcademicYear, Semester,
    Subject, SyllabusUnit, ClassSection, TeacherAssignment,
    StudentEnrollment, AttendanceSession, AttendanceRecord,
    InternalMark, Course, Batch
)
from .serializers import (
    DepartmentSerializer, AcademicProgramSerializer, AcademicYearSerializer,
    SemesterSerializer, SubjectSerializer, SubjectListSerializer, SyllabusUnitSerializer,
    ClassSectionSerializer, TeacherAssignmentSerializer, StudentEnrollmentSerializer,
    AttendanceSessionSerializer, AttendanceRecordSerializer, InternalMarkSerializer,
    CourseSerializer, BatchSerializer
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# PERMISSION HELPERS
# ─────────────────────────────────────────────────────────────────────────────
class IsTenantFacultyOrAdmin(permissions.BasePermission):
    """Faculty and Admins can write. Students are completely denied."""
    WRITE_ACTIONS = [
        'create', 'update', 'partial_update', 'destroy',
        'mark_bulk', 'bulk_enter', 'bulk_enroll'
    ]

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', '')
        if role in ('INST_ADMIN', 'INSTITUTION_ADMIN'):
            return True
        if role == 'FACULTY':
            return True
        # Students: only read-only safe actions
        if role == 'STUDENT':
            if getattr(view, 'action', None) in self.WRITE_ACTIONS:
                return False
            return True
        return False


class IsTenantFaculty(permissions.BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', '') == 'FACULTY'


# ─────────────────────────────────────────────────────────────────────────────
# 1. DEPARTMENT ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD for departments.
    Students/Faculty: read-only.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = DepartmentSerializer

    def get_queryset(self):
        return Department.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return success_response("Departments retrieved", data=serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# 2. ACADEMIC PROGRAM ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class AcademicProgramViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = AcademicProgramSerializer

    def get_queryset(self):
        qs = AcademicProgram.objects.select_related('department').filter(is_active=True)
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department__code=dept)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response("Programs retrieved", data=serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# 3. ACADEMIC YEAR ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class AcademicYearViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = AcademicYearSerializer
    queryset = AcademicYear.objects.all()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Returns the currently active academic year."""
        year = AcademicYear.objects.filter(is_current=True).first()
        if not year:
            return error_response("No current academic year configured", code=404)
        return success_response("Current academic year", data=AcademicYearSerializer(year).data)


# ─────────────────────────────────────────────────────────────────────────────
# 4. SEMESTER ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class SemesterViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = SemesterSerializer

    def get_queryset(self):
        qs = Semester.objects.select_related('program', 'academic_year')
        program = self.request.query_params.get('program')
        year = self.request.query_params.get('year')
        status_filter = self.request.query_params.get('status')
        if program:
            qs = qs.filter(program__code=program)
        if year:
            qs = qs.filter(academic_year__label=year)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]


# ─────────────────────────────────────────────────────────────────────────────
# 5. SUBJECT ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class SubjectViewSet(viewsets.ModelViewSet):
    """
    Full subject management.
    Includes placement-tagged subjects for exam auto-generation.
    """
    authentication_classes = [TenantAuthentication]

    def get_serializer_class(self):
        if self.action == 'list':
            return SubjectListSerializer
        return SubjectSerializer

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

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    def list(self, request, *args, **kwargs):
        """Override to wrap in unified success_response format."""
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return success_response("Subjects retrieved", data=serializer.data)

    @action(detail=False, methods=['get'])
    def placement_subjects(self, request):
        """Returns all placement-relevant subjects with their tags. Used by exam engine."""
        qs = Subject.objects.filter(is_placement_relevant=True, is_active=True)
        serializer = SubjectListSerializer(qs, many=True)
        return success_response("Placement-relevant subjects", data=serializer.data)

    @action(detail=True, methods=['post'])
    def add_syllabus_unit(self, request, pk=None):
        """Add a unit to a subject's syllabus."""
        subject = self.get_object()
        data = request.data.copy()
        data['subject'] = subject.id
        serializer = SyllabusUnitSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return success_response("Syllabus unit added", data=serializer.data)
        return error_response("Validation error", code=400, extra=serializer.errors)


# ─────────────────────────────────────────────────────────────────────────────
# 6. SYLLABUS UNIT ViewSet
# ─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# 7. CLASS SECTION ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class ClassSectionViewSet(viewsets.ModelViewSet):
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

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]


# ─────────────────────────────────────────────────────────────────────────────
# 8. TEACHER ASSIGNMENT ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = TeacherAssignmentSerializer

    def get_queryset(self):
        qs = TeacherAssignment.objects.select_related('subject', 'section', 'academic_year', 'semester')
        role = getattr(self.request.user, 'role', '')
        # Faculty can only see their own assignments
        if role == 'FACULTY':
            employee_id = getattr(self.request.user.academic_ref, 'employee_id', None) if hasattr(self.request.user, 'academic_ref') else None
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
        params = self.request.query_params
        if params.get('year'):
            qs = qs.filter(academic_year__label=params['year'])
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def my_subjects(self, request):
        """Faculty: Get all subjects I'm assigned to teach."""
        if getattr(request.user, 'role', '') != 'FACULTY':
            return error_response("Only faculty can access this endpoint", code=403)
        employee_id = getattr(request.user.academic_ref, 'employee_id', None) if hasattr(request.user, 'academic_ref') else None
        if not employee_id:
            return error_response("Faculty academic record not linked", code=400)
        assignments = TeacherAssignment.objects.filter(employee_id=employee_id).select_related('subject', 'academic_year')
        serializer = self.get_serializer(assignments, many=True)
        return success_response("Your subject assignments", data=serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# 9. STUDENT ENROLLMENT ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class StudentEnrollmentViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = StudentEnrollmentSerializer

    def get_queryset(self):
        qs = StudentEnrollment.objects.select_related('subject', 'section', 'semester')
        role = getattr(self.request.user, 'role', '')
        if role == 'STUDENT':
            roll = getattr(self.request.user.academic_ref, 'roll_number', None) if hasattr(self.request.user, 'academic_ref') else None
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

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

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
                    roll_number=roll,
                    subject=subject,
                    semester=semester,
                    defaults={
                        'student_name': name,
                        'section_id': section_id,
                        'status': 'ACTIVE'
                    }
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
        roll = getattr(request.user.academic_ref, 'roll_number', None) if hasattr(request.user, 'academic_ref') else None
        if not roll:
            return error_response("Student academic record not linked")
        enrollments = StudentEnrollment.objects.filter(roll_number=roll, status='ACTIVE').select_related('subject', 'semester')
        serializer = self.get_serializer(enrollments, many=True)
        return success_response("Your enrolled subjects", data=serializer.data)


# ─────────────────────────────────────────────────────────────────────────────
# 10. ATTENDANCE ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """
    Faculty marks attendance per session.
    Admin and students can view reports.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = AttendanceSessionSerializer

    def get_queryset(self):
        qs = AttendanceSession.objects.select_related('subject', 'section', 'semester').prefetch_related('records')
        params = self.request.query_params
        if params.get('subject'):
            qs = qs.filter(subject__code=params['subject'])
        if params.get('section'):
            qs = qs.filter(section_id=params['section'])
        if params.get('date'):
            qs = qs.filter(session_date=params['date'])
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'mark_bulk']:
            return [IsTenantFacultyOrAdmin()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def mark_bulk(self, request):
        """
        Create a session and mark attendance for all students in one shot.
        Expected: {
            subject_id, section_id, semester_id, session_date, session_type,
            topic_covered, employee_id, faculty_name,
            records: [{roll_number, student_name, status}]
        }
        """
        data = request.data
        try:
            subject = Subject.objects.get(id=data.get('subject_id'))
            semester = Semester.objects.get(id=data.get('semester_id'))
        except (Subject.DoesNotExist, Semester.DoesNotExist):
            return error_response("Subject or Semester not found", code=404)

        # Get faculty employee_id
        employee_id = data.get('employee_id', '')
        if not employee_id and hasattr(request.user, 'academic_ref') and request.user.academic_ref:
            employee_id = getattr(request.user.academic_ref, 'employee_id', '')

        with transaction.atomic():
            session = AttendanceSession.objects.create(
                subject=subject,
                section_id=data.get('section_id'),
                semester=semester,
                employee_id=employee_id,
                session_date=data.get('session_date'),
                session_type=data.get('session_type', 'LECTURE'),
                topic_covered=data.get('topic_covered', ''),
                remarks=data.get('remarks', '')
            )

            records_data = data.get('records', [])
            records_to_create = []
            for rec in records_data:
                records_to_create.append(AttendanceRecord(
                    session=session,
                    roll_number=rec.get('roll_number'),
                    student_name=rec.get('student_name', ''),
                    status=rec.get('status', 'ABSENT')
                ))
            AttendanceRecord.objects.bulk_create(records_to_create, ignore_conflicts=True)

        serializer = AttendanceSessionSerializer(session)
        return success_response("Attendance session created and records saved", data=serializer.data)

    @action(detail=False, methods=['get'])
    def student_report(self, request):
        """
        Get attendance report for a specific student.
        Params: roll_number, subject_code (optional)
        """
        roll = request.query_params.get('roll_number')
        subject_code = request.query_params.get('subject_code')

        # Students can only view their own report
        if getattr(request.user, 'role', '') == 'STUDENT':
            roll = getattr(request.user.academic_ref, 'roll_number', None) if hasattr(request.user, 'academic_ref') else roll

        if not roll:
            return error_response("roll_number is required")

        records_qs = AttendanceRecord.objects.filter(roll_number=roll).select_related('session__subject', 'session__semester')

        if subject_code:
            records_qs = records_qs.filter(session__subject__code=subject_code)

        # Aggregate by subject
        from collections import defaultdict
        subject_map = defaultdict(lambda: {'total': 0, 'present': 0, 'absent': 0, 'sessions': []})

        for rec in records_qs:
            subj = rec.session.subject.code
            subject_map[subj]['total'] += 1
            if rec.status in ('PRESENT', 'LATE', 'OD'):
                subject_map[subj]['present'] += 1
            else:
                subject_map[subj]['absent'] += 1

        report = []
        for subj_code, data in subject_map.items():
            pct = round((data['present'] / data['total']) * 100, 1) if data['total'] else 0
            report.append({
                'subject_code': subj_code,
                'total_classes': data['total'],
                'present': data['present'],
                'absent': data['absent'],
                'percentage': pct,
                'detained_risk': pct < 75
            })

        return success_response("Student attendance report", data={
            'roll_number': roll,
            'subjects': report
        })

    @action(detail=False, methods=['get'])
    def low_attendance_students(self, request):
        """
        Admin/Faculty: Get students with attendance below threshold.
        Params: subject_code, threshold (default 75)
        """
        subject_code = request.query_params.get('subject_code')
        threshold = float(request.query_params.get('threshold', 75))

        if not subject_code:
            return error_response("subject_code is required")

        sessions = AttendanceSession.objects.filter(subject__code=subject_code)
        total_sessions = sessions.count()

        if total_sessions == 0:
            return success_response("No attendance data", data=[])

        from collections import defaultdict
        student_map = defaultdict(lambda: {'name': '', 'present': 0})

        for session in sessions:
            for rec in session.records.all():
                student_map[rec.roll_number]['name'] = rec.student_name
                if rec.status in ('PRESENT', 'LATE', 'OD'):
                    student_map[rec.roll_number]['present'] += 1

        flagged = []
        for roll, data in student_map.items():
            pct = round((data['present'] / total_sessions) * 100, 1)
            if pct < threshold:
                flagged.append({
                    'roll_number': roll,
                    'student_name': data['name'],
                    'percentage': pct,
                    'present': data['present'],
                    'total': total_sessions
                })

        flagged.sort(key=lambda x: x['percentage'])
        return success_response(
            f"Students with attendance below {threshold}%",
            data={'subject': subject_code, 'threshold': threshold, 'students': flagged}
        )


# ─────────────────────────────────────────────────────────────────────────────
# 11. INTERNAL MARKS ViewSet
# ─────────────────────────────────────────────────────────────────────────────
class InternalMarkViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = InternalMarkSerializer

    def get_queryset(self):
        qs = InternalMark.objects.select_related('subject', 'semester')
        role = getattr(self.request.user, 'role', '')
        if role == 'STUDENT':
            roll = getattr(self.request.user.academic_ref, 'roll_number', None) if hasattr(self.request.user, 'academic_ref') else None
            if roll:
                qs = qs.filter(roll_number=roll)
        params = self.request.query_params
        if params.get('roll_number') and role != 'STUDENT':
            qs = qs.filter(roll_number=params['roll_number'])
        if params.get('subject'):
            qs = qs.filter(subject__code=params['subject'])
        if params.get('semester'):
            qs = qs.filter(semester_id=params['semester'])
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantFacultyOrAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        employee_id = ''
        if hasattr(self.request.user, 'academic_ref') and self.request.user.academic_ref:
            employee_id = getattr(self.request.user.academic_ref, 'employee_id', '')
        serializer.save(entered_by=employee_id)

    @action(detail=False, methods=['post'], permission_classes=[IsTenantFacultyOrAdmin])
    def bulk_enter(self, request):
        """
        Bulk enter marks for multiple students.
        Expected: {subject_id, semester_id, assessment_type, max_marks, records: [{roll_number, marks}]}
        """
        # Explicit role guard: students must never reach this
        if getattr(request.user, 'role', '') == 'STUDENT':
            return error_response("You are not allowed to enter marks", code=403)

        subject_id = request.data.get('subject_id')
        semester_id = request.data.get('semester_id')
        assessment_type = request.data.get('assessment_type')
        max_marks = request.data.get('max_marks', 25)
        records = request.data.get('records', [])

        if not all([subject_id, semester_id, assessment_type, records]):
            return error_response("subject_id, semester_id, assessment_type, and records are required")

        try:
            Subject.objects.get(id=subject_id)
            Semester.objects.get(id=semester_id)
        except (Subject.DoesNotExist, Semester.DoesNotExist):
            return error_response("Subject or Semester not found", code=404)

        employee_id = ''
        if hasattr(request.user, 'academic_ref') and request.user.academic_ref:
            employee_id = getattr(request.user.academic_ref, 'employee_id', '')

        created = 0
        updated = 0
        with transaction.atomic():
            for rec in records:
                roll = rec.get('roll_number')
                marks = rec.get('marks', 0)
                if not roll:
                    continue
                obj, was_created = InternalMark.objects.update_or_create(
                    roll_number=roll,
                    subject_id=subject_id,
                    semester_id=semester_id,
                    assessment_type=assessment_type,
                    defaults={
                        'marks_obtained': marks,
                        'max_marks': max_marks,
                        'entered_by': employee_id
                    }
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        return success_response(
            f"Marks saved: {created} new, {updated} updated",
            data={'created': created, 'updated': updated}
        )

    @action(detail=False, methods=['get'])
    def class_report(self, request):
        """
        Class-level marks report for faculty.
        Params: subject_code, semester_id, assessment_type
        """
        qs = self.get_queryset()
        subject_code = request.query_params.get('subject_code')
        if subject_code:
            qs = qs.filter(subject__code=subject_code)

        avg = qs.aggregate(avg=Avg('marks_obtained'))['avg'] or 0
        records = self.get_serializer(qs, many=True).data

        return success_response("Class marks report", data={
            'class_average': round(avg, 2),
            'total_records': qs.count(),
            'records': records
        })


# ─────────────────────────────────────────────────────────────────────────────
# 12. LEGACY: Course + Batch ViewSets (backward compat with quizzes)
# ─────────────────────────────────────────────────────────────────────────────
class CourseViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = CourseSerializer

    def get_queryset(self):
        return Course.objects.select_related('department', 'program')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]


class BatchViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = BatchSerializer

    def get_queryset(self):
        return Batch.objects.select_related('course')

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

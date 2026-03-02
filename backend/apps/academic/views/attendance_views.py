# apps/academic/views/attendance_views.py
# AttendanceSessionViewSet (mark_bulk, student_report, low_attendance_students)
import logging
from collections import defaultdict
from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action

from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response

from apps.academic.models import AttendanceSession, AttendanceRecord, Subject, Semester
from apps.academic.serializers import AttendanceSessionSerializer
from ._permissions import IsTenantFacultyOrAdmin

logger = logging.getLogger(__name__)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """Faculty marks attendance per session. Admin and students can view reports."""
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
        Expected: {subject_id, section_id, semester_id, session_date, session_type,
                   topic_covered, employee_id, faculty_name, records: [{roll_number, student_name, status}]}
        """
        data = request.data
        try:
            subject = Subject.objects.get(id=data.get('subject_id'))
            semester = Semester.objects.get(id=data.get('semester_id'))
        except (Subject.DoesNotExist, Semester.DoesNotExist):
            return error_response("Subject or Semester not found", code=404)

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
            records_to_create = [
                AttendanceRecord(
                    session=session,
                    roll_number=rec.get('roll_number'),
                    student_name=rec.get('student_name', ''),
                    status=rec.get('status', 'ABSENT')
                )
                for rec in data.get('records', [])
            ]
            AttendanceRecord.objects.bulk_create(records_to_create, ignore_conflicts=True)

        return success_response("Attendance session created and records saved", data=AttendanceSessionSerializer(session).data)

    @action(detail=False, methods=['get'])
    def student_report(self, request):
        """
        Get attendance report for a specific student.
        Params: roll_number, subject_code (optional)
        """
        roll = request.query_params.get('roll_number')
        subject_code = request.query_params.get('subject_code')

        if getattr(request.user, 'role', '') == 'STUDENT':
            roll = getattr(request.user.academic_ref, 'roll_number', None) \
                if hasattr(request.user, 'academic_ref') else roll

        if not roll:
            return error_response("roll_number is required")

        records_qs = AttendanceRecord.objects.filter(roll_number=roll).select_related('session__subject', 'session__semester')
        if subject_code:
            records_qs = records_qs.filter(session__subject__code=subject_code)

        subject_map = defaultdict(lambda: {'total': 0, 'present': 0, 'absent': 0})
        for rec in records_qs:
            subj = rec.session.subject.code
            subject_map[subj]['total'] += 1
            if rec.status in ('PRESENT', 'LATE', 'OD'):
                subject_map[subj]['present'] += 1
            else:
                subject_map[subj]['absent'] += 1

        report = [
            {
                'subject_code': subj_code,
                'total_classes': d['total'],
                'present': d['present'],
                'absent': d['absent'],
                'percentage': round((d['present'] / d['total']) * 100, 1) if d['total'] else 0,
                'detained_risk': (d['present'] / d['total'] * 100 < 75) if d['total'] else False,
            }
            for subj_code, d in subject_map.items()
        ]
        return success_response("Student attendance report", data={'roll_number': roll, 'subjects': report})

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

        student_map = defaultdict(lambda: {'name': '', 'present': 0})
        for session in sessions:
            for rec in session.records.all():
                student_map[rec.roll_number]['name'] = rec.student_name
                if rec.status in ('PRESENT', 'LATE', 'OD'):
                    student_map[rec.roll_number]['present'] += 1

        flagged = sorted(
            [
                {
                    'roll_number': roll,
                    'student_name': d['name'],
                    'percentage': round((d['present'] / total_sessions) * 100, 1),
                    'present': d['present'],
                    'total': total_sessions
                }
                for roll, d in student_map.items()
                if (d['present'] / total_sessions * 100) < threshold
            ],
            key=lambda x: x['percentage']
        )
        return success_response(
            f"Students with attendance below {threshold}%",
            data={'subject': subject_code, 'threshold': threshold, 'students': flagged}
        )

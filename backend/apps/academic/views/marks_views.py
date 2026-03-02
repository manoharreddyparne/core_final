from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from django.db import transaction
from django.db.models import Avg

from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from apps.auip_institution.permissions import IsTenantAdmin
from ._permissions import IsTenantFacultyOrAdmin
from apps.academic.models import Subject, Semester, Course, Batch, InternalMark
from apps.academic.serializers import InternalMarkSerializer, CourseSerializer, BatchSerializer

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
        employee_id = getattr(request.user.academic_ref, 'employee_id', '') if hasattr(request.user, 'academic_ref') and request.user.academic_ref else ''
        created, updated = 0, 0
        with transaction.atomic():
            for rec in records:
                roll, marks = rec.get('roll_number'), rec.get('marks', 0)
                if not roll: continue
                obj, was_created = InternalMark.objects.update_or_create(roll_number=roll, subject_id=subject_id, semester_id=semester_id, assessment_type=assessment_type, defaults={'marks_obtained': marks, 'max_marks': max_marks, 'entered_by': employee_id})
                if was_created: created += 1
                else: updated += 1
        return success_response(f"Marks saved: {created} new, {updated} updated", data={'created': created, 'updated': updated})

    @action(detail=False, methods=['get'])
    def class_report(self, request):
        qs = self.get_queryset()
        subject_code = request.query_params.get('subject_code')
        if subject_code: qs = qs.filter(subject__code=subject_code)
        avg = qs.aggregate(avg=Avg('marks_obtained'))['avg'] or 0
        records = self.get_serializer(qs, many=True).data
        return success_response("Class marks report", data={'class_average': round(avg, 2), 'total_records': qs.count(), 'records': records})

class CourseViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = CourseSerializer
    def get_queryset(self): return Course.objects.select_related('department', 'program')
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']: return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

class BatchViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    serializer_class = BatchSerializer
    def get_queryset(self): return Batch.objects.select_related('course')
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']: return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

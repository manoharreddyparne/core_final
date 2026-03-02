# apps/academic/serializers/classroom_serializers.py
# ClassSection, TeacherAssignment, StudentEnrollment, AttendanceSession/Record, InternalMark
from rest_framework import serializers
from apps.academic.models import (
    ClassSection, TeacherAssignment, StudentEnrollment,
    AttendanceSession, AttendanceRecord, InternalMark,
)


class ClassSectionSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.label', read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassSection
        fields = [
            'id', 'program', 'program_name', 'academic_year', 'academic_year_label',
            'semester_number', 'name', 'max_strength', 'enrolled_count', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'enrolled_count']

    def get_enrolled_count(self, obj):
        return obj.enrollments.count()


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    section_label = serializers.SerializerMethodField()
    academic_year_label = serializers.CharField(source='academic_year.label', read_only=True)
    subject_max_marks = serializers.IntegerField(source='subject.max_marks', read_only=True)

    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'employee_id', 'faculty_name', 'subject', 'subject_name', 'subject_code',
            'subject_max_marks', 'section', 'section_label', 'academic_year', 'academic_year_label',
            'semester', 'is_primary', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_section_label(self, obj):
        return str(obj.section) if obj.section else None


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    semester_label = serializers.CharField(source='semester.__str__', read_only=True)

    class Meta:
        model = StudentEnrollment
        fields = [
            'id', 'roll_number', 'student_name', 'subject', 'subject_name',
            'subject_code', 'section', 'semester', 'semester_label',
            'status', 'enrolled_at', 'updated_at'
        ]
        read_only_fields = ['id', 'enrolled_at', 'updated_at']


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = ['id', 'roll_number', 'student_name', 'status', 'marked_at']
        read_only_fields = ['id', 'marked_at']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    attendance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'subject', 'subject_name', 'section', 'semester',
            'employee_id', 'session_date', 'session_type', 'topic_covered',
            'remarks', 'records', 'present_count', 'absent_count',
            'attendance_percentage', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'records']

    def get_present_count(self, obj):
        return obj.records.filter(status='PRESENT').count()

    def get_absent_count(self, obj):
        return obj.records.filter(status='ABSENT').count()

    def get_attendance_percentage(self, obj):
        total = obj.records.count()
        if not total:
            return 0
        present = obj.records.filter(status='PRESENT').count()
        return round((present / total) * 100, 1)


class InternalMarkSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = InternalMark
        fields = [
            'id', 'roll_number', 'subject', 'subject_name', 'subject_code',
            'semester', 'assessment_type', 'marks_obtained', 'max_marks',
            'percentage', 'remarks', 'entered_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'percentage']

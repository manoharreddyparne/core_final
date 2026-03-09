# apps/academic/serializers/foundation_serializers.py
# Department, AcademicProgram, AcademicYear, Semester
from rest_framework import serializers
from apps.academic.models import Department, AcademicProgram, AcademicYear, Semester


class DepartmentSerializer(serializers.ModelSerializer):
    head_email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head_email', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AcademicProgramSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)

    class Meta:
        model = AcademicProgram
        fields = [
            'id', 'department', 'department_name', 'department_code',
            'name', 'code', 'degree_type', 'duration_years',
            'total_semesters', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'label', 'start_date', 'end_date', 'is_current', 'created_at']
        read_only_fields = ['id', 'created_at']


class SemesterSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    academic_year_label = serializers.CharField(source='academic_year.label', read_only=True)

    class Meta:
        model = Semester
        fields = [
            'id', 'program', 'program_name', 'academic_year', 'academic_year_label',
            'semester_number', 'label', 'start_date', 'end_date', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

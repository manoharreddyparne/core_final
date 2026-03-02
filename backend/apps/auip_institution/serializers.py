from rest_framework import serializers
from apps.auip_institution.models import (
    StudentAcademicRegistry, StudentPreSeededRegistry, StudentAuthorizedAccount,
    FacultyAcademicRegistry, FacultyPreSeededRegistry
)

class StudentAcademicRegistrySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    department = serializers.CharField(source='branch', read_only=True)
    
    # 🧬 Rich Data Context for Frontend
    program_name = serializers.CharField(source='program_ref.name', read_only=True)
    department_name = serializers.CharField(source='department_ref.name', read_only=True)
    section_name = serializers.CharField(source='section_ref.name', read_only=True)
    semester_label = serializers.CharField(source='semester_ref.label', read_only=True)

    class Meta:
        model = StudentAcademicRegistry
        fields = [
            'id', 'roll_number', 'full_name', 'official_email', 'personal_email',
            'phone_number', 'program', 'branch', 'department', 'batch_year',
            'admission_year', 'passout_year', 'current_semester', 'section',
            'cgpa', 'date_of_birth', 'status', 'created_at',
            'program_ref', 'department_ref', 'section_ref', 'semester_ref',
            'program_name', 'department_name', 'section_name', 'semester_label'
        ]

    def get_status(self, obj):
        from apps.auip_institution.models import StudentAuthorizedAccount
        if StudentAuthorizedAccount.objects.filter(email=obj.official_email).exists():
            return "ACTIVE"
        return "SEEDED"

class StudentPreSeededRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentPreSeededRegistry
        fields = '__all__'

class StudentAuthorizedAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAuthorizedAccount
        fields = ['id', 'email', 'is_active', 'last_login_at']

class FacultyAcademicRegistrySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department_ref.name', read_only=True)

    class Meta:
        model = FacultyAcademicRegistry
        fields = [
            'id', 'employee_id', 'full_name', 'email',
            'designation', 'department', 'joining_date',
            'courses_handling', 'status', 'created_at',
            'department_ref', 'department_name'
        ]

    def get_status(self, obj):
        from apps.auip_institution.models import FacultyAuthorizedAccount
        if FacultyAuthorizedAccount.objects.filter(email=obj.email).exists():
            return "ACTIVE"
        return "SEEDED"

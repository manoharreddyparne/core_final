from rest_framework import serializers
from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry, StudentAuthorizedAccount

class StudentAcademicRegistrySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    department = serializers.CharField(source='branch', read_only=True)

    class Meta:
        model = StudentAcademicRegistry
        fields = [
            'id', 'roll_number', 'full_name', 'official_email', 'personal_email',
            'phone_number', 'program', 'branch', 'department', 'batch_year',
            'admission_year', 'passout_year', 'current_semester', 'section',
            'cgpa', 'date_of_birth', 'status', 'created_at'
        ]

    def get_status(self, obj):
        # Determine status based on associated account
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

from apps.auip_institution.models import FacultyAcademicRegistry, FacultyPreSeededRegistry

class FacultyAcademicRegistrySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = FacultyAcademicRegistry
        fields = [
            'id', 'employee_id', 'full_name', 'email',
            'designation', 'department', 'joining_date',
            'courses_handling', 'status', 'created_at'
        ]

    def get_status(self, obj):
        # Determine status based on associated account
        from apps.auip_institution.models import FacultyAuthorizedAccount
        if FacultyAuthorizedAccount.objects.filter(email=obj.email).exists():
            return "ACTIVE"
        return "SEEDED"

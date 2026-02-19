from rest_framework import serializers
from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry, StudentAuthorizedAccount

class StudentAcademicRegistrySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    department = serializers.CharField(source='branch', read_only=True)

    class Meta:
        model = StudentAcademicRegistry
        fields = [
            'id', 'roll_number', 'full_name', 'official_email', 'personal_email', 
            'program', 'branch', 'department', 'batch_year', 'current_semester', 
            'section', 'cgpa', 'status', 'created_at'
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

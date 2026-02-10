"""
Serializers for Core Student model
"""

from rest_framework import serializers
from apps.identity.models.core import CoreStudent


class CoreStudentSerializer(serializers.ModelSerializer):
    """Serializer for Core Student data (read-only for students)"""
    
    academic_summary = serializers.ReadOnlyField()
    is_invited = serializers.ReadOnlyField()
    is_active_student = serializers.ReadOnlyField(source='is_active')
    
    class Meta:
        model = CoreStudent
        fields = [
            'stu_ref',
            'roll_number',
            'full_name',
            'department',
            'batch_year',
            'current_semester',
            'cgpa',
            'tenth_percentage',
            'twelfth_percentage',
            'attendance_percentage',
            'official_email',
            'status',
            'seeded_at',
            'updated_at',
            'is_eligible_for_placement',
            'placement_eligibility_reason',
            'academic_summary',
            'is_invited',
            'is_active_student',
        ]
        read_only_fields = fields  # All fields read-only for students


class CoreStudentBulkUploadSerializer(serializers.Serializer):
    """Serializer for validating bulk CSV upload data"""
    
    stu_ref = serializers.CharField(max_length=20)
    roll_number = serializers.CharField(max_length=50)
    full_name = serializers.CharField(max_length=255)
    department = serializers.ChoiceField(choices=CoreStudent.DEPARTMENT_CHOICES)
    batch_year = serializers.IntegerField(min_value=2000, max_value=2100)
    current_semester = serializers.IntegerField(min_value=1, max_value=8)
    official_email = serializers.EmailField()
    tenth_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    twelfth_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100)
    cgpa = serializers.DecimalField(max_digits=3, decimal_places=2, min_value=0, max_value=10, required=False, allow_null=True)
    attendance_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=0, max_value=100, required=False, allow_null=True)
    
    def validate_stu_ref(self, value):
        """Validate STU_REF format"""
        parts = value.split('-')
        if len(parts) != 3:
            raise serializers.ValidationError(
                'STU_REF must be in format: YEAR-DEPT-NUMBER (e.g., 2021-CS-001)'
            )
        return value
    
    def validate(self, data):
        """Check for duplicates"""
        # Check if stu_ref already exists
        if CoreStudent.objects.filter(stu_ref=data['stu_ref']).exists():
            raise serializers.ValidationError({
                'stu_ref': f"Student with STU_REF {data['stu_ref']} already exists"
            })
        
        # Check if roll_number already exists
        if CoreStudent.objects.filter(roll_number=data['roll_number']).exists():
            raise serializers.ValidationError({
                'roll_number': f"Student with roll number {data['roll_number']} already exists"
            })
        
        # Check if email already exists
        if CoreStudent.objects.filter(official_email=data['official_email']).exists():
            raise serializers.ValidationError({
                'official_email': f"Student with email {data['official_email']} already exists"
            })
        
        return data


class BulkUploadResponseSerializer(serializers.Serializer):
    """Response serializer for bulk upload"""
    
    total_rows = serializers.IntegerField()
    successful = serializers.IntegerField()
    failed = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField(), required=False)
    created_students = serializers.ListField(child=serializers.CharField(), required=False)

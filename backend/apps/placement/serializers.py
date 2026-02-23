from rest_framework import serializers
from apps.placement.models import PlacementDrive, PlacementApplication, PlacementProcessStage

class PlacementProcessStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementProcessStage
        fields = '__all__'

class PlacementDriveSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and viewing Placement Drives.
    """
    is_eligible = serializers.BooleanField(required=False, read_only=True)
    eligibility_reason = serializers.CharField(required=False, read_only=True)
    application_status = serializers.CharField(required=False, read_only=True)

    class Meta:
        model = PlacementDrive
        fields = [
            'id', 'company_name', 'role', 'job_description', 'package_details',
            'location', 'deadline', 'status', 'min_cgpa', 'min_10th_percent',
            'min_12th_percent', 'eligible_branches', 'eligible_batches',
            'other_requirements', 'created_at', 'updated_at',
            'is_eligible', 'eligibility_reason', 'application_status'
        ]

class PlacementApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for student applications to drives.
    """
    stages = PlacementProcessStageSerializer(many=True, read_only=True)
    drive_details = PlacementDriveSerializer(source='drive', read_only=True)
    student_details = serializers.SerializerMethodField()

    class Meta:
        model = PlacementApplication
        fields = ['id', 'drive', 'drive_details', 'student', 'student_details', 'resume_url', 'status', 'stages', 'applied_at', 'updated_at']
        read_only_fields = ['student', 'status', 'applied_at']

    def get_student_details(self, obj):
        if obj.student:
            return {
                "full_name": obj.student.full_name,
                "roll_number": obj.student.roll_number,
                "email": obj.student.official_email,
                "branch": obj.student.branch,
                "cgpa": obj.student.cgpa,
            }
        return None

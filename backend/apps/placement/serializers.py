import json
from rest_framework import serializers
from apps.placement.models import PlacementDrive, PlacementApplication, PlacementProcessStage


class PlacementProcessStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementProcessStage
        fields = '__all__'


class PlacementDriveSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and viewing Placement Drives.
    Handles FormData submissions where JSON fields (eligible_branches, etc.)
    are sent as JSON strings and need to be parsed back to Python types.
    """
    is_eligible = serializers.BooleanField(required=False, read_only=True)
    eligibility_reason = serializers.CharField(required=False, read_only=True)
    application_status = serializers.CharField(required=False, read_only=True)

    class Meta:
        model = PlacementDrive
        fields = [
            'id', 'company_name', 'role', 'job_description', 'package_details',
            'location', 'experience_years', 'qualifications', 'salary_range',
            'contact_details', 'hiring_process', 'custom_criteria',
            'deadline', 'status',
            'min_cgpa', 'min_ug_percentage', 'cgpa_to_percentage_multiplier',
            'min_10th_percent', 'min_12th_percent',
            'allowed_active_backlogs', 'eligible_branches', 'eligible_batches',
            'other_requirements', 'jd_document',
            'is_broadcasted', 'chat_session_id', 'created_at', 'updated_at',
            'is_eligible', 'eligibility_reason', 'application_status',
            'experience_years',
        ]

    def _coerce_json_field(self, data, field_name, default):
        """Parse a field from FormData that may have been sent as a JSON string."""
        val = data.get(field_name)
        if isinstance(val, (list, dict)):
            return val
        if isinstance(val, str):
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
        return default

    def to_internal_value(self, data):
        """
        Coerce JSON string fields back to Python objects when receiving
        multipart/form-data (FormData) submissions.
        """
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)

        for field in ['eligible_branches', 'eligible_batches', 'qualifications',
                      'contact_details', 'hiring_process']:
            if field in mutable and isinstance(mutable[field], str):
                try:
                    mutable[field] = json.loads(mutable[field])
                except (json.JSONDecodeError, TypeError):
                    mutable[field] = []

        if 'custom_criteria' in mutable and isinstance(mutable['custom_criteria'], str):
            try:
                mutable['custom_criteria'] = json.loads(mutable['custom_criteria'])
            except (json.JSONDecodeError, TypeError):
                mutable['custom_criteria'] = {}

        return super().to_internal_value(mutable)


class PlacementApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for student applications to drives.
    """
    stages = PlacementProcessStageSerializer(many=True, read_only=True)
    drive_details = PlacementDriveSerializer(source='drive', read_only=True)
    student_details = serializers.SerializerMethodField()

    class Meta:
        model = PlacementApplication
        fields = ['id', 'drive', 'drive_details', 'student', 'student_details',
                  'resume_url', 'status', 'stages', 'applied_at', 'updated_at']
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

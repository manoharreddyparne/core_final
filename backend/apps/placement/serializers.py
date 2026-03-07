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
    jd_document = serializers.FileField(required=False, allow_null=True)
    company_name = serializers.CharField(required=False, allow_blank=True)
    role = serializers.CharField(required=False, allow_blank=True)
    job_description = serializers.CharField(required=False, allow_blank=True)
    package_details = serializers.CharField(required=False, allow_blank=True)

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
            'excluded_rolls', 'manual_students', 'is_inclusion_mode', 'included_rolls',
            'other_requirements', 'jd_document',
            'neural_metadata',
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

    def validate_manual_students(self, value):
        """Ensure all manually added roll numbers exist in the registry."""
        if not value:
            return []
            
        from apps.auip_institution.models import StudentAcademicRegistry
        existing_rolls = set(StudentAcademicRegistry.objects.filter(roll_number__in=value).values_list('roll_number', flat=True))
        invalid_rolls = [r for r in value if r not in existing_rolls]
        
        if invalid_rolls:
            raise serializers.ValidationError(f"Invalid roll numbers: {', '.join(invalid_rolls)}. Please search and add real students.")
            
        return list(existing_rolls)

    def validate(self, data):
        """Cross-field validation for performance metrics."""
        min_cgpa = data.get('min_cgpa')
        min_ug = data.get('min_ug_percentage')

        # Prevent defining both metrics simultaneously to avoid confusion
        # If both are > 0, raise a validation error
        if min_cgpa and float(min_cgpa) > 0 and min_ug and float(min_ug) > 0:
            raise serializers.ValidationError({
                "min_cgpa": "Please define ONLY one undergraduate metric (either CGPA or UG Percentage), not both."
            })
        return data

    def to_internal_value(self, data):
        """
        Coerce JSON string fields back to Python objects when receiving
        multipart/form-data (FormData) submissions.
        Handle empty strings for numeric and UUID fields.
        """
        # Convert QueryDict to a standard dict
        mutable = data.dict() if hasattr(data, 'dict') else (data.copy() if hasattr(data, 'copy') else dict(data))

        # 1. Handle JSON fields
        json_fields = ['eligible_branches', 'eligible_batches', 'qualifications',
                       'contact_details', 'hiring_process', 'excluded_rolls', 
                       'manual_students', 'included_rolls', 'custom_criteria',
                       'neural_metadata']
        for field in json_fields:
            if field in mutable and isinstance(mutable[field], str):
                try:
                    mutable[field] = json.loads(mutable[field])
                except (json.JSONDecodeError, TypeError):
                    if field == 'custom_criteria' or field == 'neural_metadata':
                        mutable[field] = {}
                    else:
                        mutable[field] = []
        
        # 🧪 Neural Persistence: Move any incoming "AI keys" into neural_metadata container
        # This keeps the model schema clean while allowing arbitrary AI attributes.
        neural = mutable.get('neural_metadata', {})
        if not isinstance(neural, dict): neural = {}
        
        known_model_fields = [f.name for f in PlacementDrive._meta.fields]
        known_model_fields.extend(['is_broadcasted', 'chat_session_id', 'jd_document'])
        
        # Identify common AI keys that might be sent but aren't in model
        ai_keys = ['primary_skills', 'secondary_skills', 'difficulty_level', 'drive_type', 'role_category', 'social_blurbs', 'narrative_summary']
        for k in ai_keys:
            if k in mutable and k not in known_model_fields:
                neural[k] = mutable[k]
        
        mutable['neural_metadata'] = neural

        # 2. Handle Numeric fields (convert empty strings to 0 or None)
        numeric_fields = ['min_cgpa', 'min_ug_percentage', 'cgpa_to_percentage_multiplier',
                          'min_10th_percent', 'min_12th_percent', 'allowed_active_backlogs']
        for field in numeric_fields:
            if field in mutable and (mutable[field] == '' or mutable[field] is None):
                mutable[field] = 0

        # 3. Handle UUID fields
        if 'chat_session_id' in mutable and (mutable['chat_session_id'] == '' or mutable['chat_session_id'] is None):
            mutable['chat_session_id'] = None

        # 4. Handle File fields sent as strings (URLs)
        # If jd_document is a string (e.g. "http://..."), it means the file is already 
        # on the server and we aren't uploading a new one. 
        # DRF FileField doesn't like strings, so we remove it if it's not a proper File object.
        if 'jd_document' in mutable and isinstance(mutable['jd_document'], str):
            del mutable['jd_document']

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

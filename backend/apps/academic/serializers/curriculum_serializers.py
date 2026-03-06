# apps/academic/serializers/curriculum_serializers.py
# Subject, SyllabusUnit + legacy Course, Batch
from rest_framework import serializers
from apps.academic.models import Subject, SyllabusUnit, Course, Batch


class SyllabusUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = SyllabusUnit
        fields = [
            'id', 'subject', 'unit_number', 'title',
            'topics', 'hours_required', 'ai_question_weight', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SubjectSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    program_name = serializers.CharField(source='program.name', read_only=True)
    syllabus_units = SyllabusUnitSerializer(many=True, read_only=True)

    class Meta:
        model = Subject
        fields = [
            'id', 'department', 'department_name', 'program', 'program_name',
            'semester_number', 'name', 'code', 'subject_type', 'credits',
            'max_marks', 'passing_marks', 'is_placement_relevant',
            'placement_tags', 'description', 'is_active',
            'syllabus_units', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'syllabus_units']


class SubjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    department_code = serializers.CharField(source='department.code', read_only=True)
    syllabus_units_count = serializers.IntegerField(source='_syllabus_units_count', read_only=True)
    syllabus_ai_ready = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'name', 'subject_type', 'credits',
            'semester_number', 'is_placement_relevant', 'placement_tags',
            'department_code', 'is_active', 'syllabus_units_count', 'syllabus_ai_ready'
        ]

    def get_syllabus_ai_ready(self, obj):
        return obj.syllabus_units.filter(ai_question_weight__gt=0).exists()


# Legacy
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ['id', 'name', 'code', 'description', 'department', 'program', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class BatchSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = Batch
        fields = ['id', 'course', 'course_name', 'name', 'start_date', 'end_date', 'roll_numbers', 'created_at']
        read_only_fields = ['id', 'created_at']

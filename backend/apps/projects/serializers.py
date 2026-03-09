from rest_framework import serializers
from .models import StudentProject, ProjectLike, ProjectFeedback

class ProjectFeedbackSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ProjectFeedback
        fields = ['id', 'faculty_id', 'faculty_name', 'comment', 'status', 'status_display', 'created_at']
        read_only_fields = ['faculty_id', 'faculty_name', 'created_at']

class StudentProjectSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_roll = serializers.CharField(source='student.roll_number', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_liked = serializers.SerializerMethodField()
    feedback = ProjectFeedbackSerializer(source='feedback_entries', many=True, read_only=True)

    class Meta:
        model = StudentProject
        fields = [
            'id', 'student', 'student_name', 'student_roll', 
            'title', 'description', 'abstract', 'group_name', 'batch_id',
            'category', 'category_display', 
            'file', 'documentation_file', 'research_paper', 'project_link',
            'keywords', 'co_authors', 'department', 'research_area', 'publication_date',
            'views_count', 'likes_count', 'is_liked', 'is_approved',
            'feedback', 'created_at', 'updated_at'

        ]
        read_only_fields = ['student', 'views_count', 'likes_count', 'is_approved', 'created_at', 'updated_at']


    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            user_id = getattr(request.user, 'pk', None)
            user_role = getattr(request.user, 'role', 'STUDENT')
            return ProjectLike.objects.filter(project=obj, user_id=user_id, user_role=user_role).exists()
        return False

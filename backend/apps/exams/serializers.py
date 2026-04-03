from rest_framework import serializers
from .models import (
    Exam, ExamSection, QuestionBank, QuestionOption, 
    ExamQuestionMapping, ExamAttempt, ExamAnswer, ExamAntiCheatLog
)
from apps.identity.serializers import UserSerializer

class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'is_correct']

class QuestionBankSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuestionBank
        fields = [
            'id', 'text', 'question_type', 'topic', 'difficulty', 
            'default_marks', 'coding_metadata', 'tags', 'options'
        ]

class ExamQuestionMappingSerializer(serializers.ModelSerializer):
    question = QuestionBankSerializer(read_only=True)
    
    class Meta:
        model = ExamQuestionMapping
        fields = ['id', 'question', 'marks_override', 'order']

class ExamSectionSerializer(serializers.ModelSerializer):
    questions = ExamQuestionMappingSerializer(many=True, read_only=True)
    
    class Meta:
        model = ExamSection
        fields = ['id', 'title', 'description', 'order', 'questions']

class ExamSerializer(serializers.ModelSerializer):
    sections = ExamSectionSerializer(many=True, read_only=True)
    mappings = ExamQuestionMappingSerializer(many=True, read_only=True)
    questions_count = serializers.IntegerField(source='mappings.count', read_only=True)
    
    class Meta:
        model = Exam
        fields = [
            'id', 'course', 'batch', 'title', 'description', 'is_mock', 
            'duration_minutes', 'start_time', 'end_time', 
            'anti_cheat_enabled', 'strict_mode', 'violation_threshold',
            'enable_webcam', 'enable_microphone', 'device_restriction',
            'allow_resume', 'randomize_questions', 'show_results_immediately',
            'pass_marks', 'total_marks', 'attempt_limit',
            'questions_count', 'sections', 'mappings'
        ]

class ExamAttemptSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    exam_details = ExamSerializer(source='exam', read_only=True)
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_details', 'student', 'started_at', 'completed_at', 
            'is_submitted', 'is_blocked', 'blocked_reason', 
            'raw_score', 'violation_score', 'draft_answers', 'status'
        ]

class ExamAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAnswer
        fields = [
            'id', 'attempt', 'question_mapping', 'selected_options', 
            'text_answer', 'is_correct', 'manual_score', 'compilation_data'
        ]

class ExamAntiCheatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAntiCheatLog
        fields = ['id', 'event_type', 'details', 'evidence_image_url', 'timestamp']

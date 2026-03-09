from rest_framework import serializers
from .models import Exam, QuestionBank, QuestionOption, ExamQuestionMapping, ExamAttempt, ExamAnswer, ExamAntiCheatLog
from apps.identity.serializers import UserSerializer
from apps.academic.serializers import CourseSerializer, BatchSerializer

class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'is_correct']

class QuestionBankSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuestionBank
        fields = ['id', 'text', 'question_type', 'topic', 'difficulty', 'default_marks', 'tags', 'options']

class ExamQuestionMappingSerializer(serializers.ModelSerializer):
    question = QuestionBankSerializer(read_only=True)
    
    class Meta:
        model = ExamQuestionMapping
        fields = ['id', 'question', 'marks_override', 'order']

class ExamMappingInExamSerializer(serializers.ModelSerializer):
    question = QuestionBankSerializer(read_only=True)
    class Meta:
        model = ExamQuestionMapping
        fields = ['id', 'question', 'marks_override', 'order']

class ExamSerializer(serializers.ModelSerializer):
    questions_count = serializers.IntegerField(source='mappings.count', read_only=True)
    # Include mappings when showing detail
    mappings = ExamMappingInExamSerializer(many=True, read_only=True)
    
    class Meta:
        model = Exam
        fields = [
            'id', 'course', 'batch', 'title', 'description', 'is_mock', 
            'duration_minutes', 'start_time', 'end_time', 'anti_cheat_enabled', 
            'randomize_questions', 'pass_marks', 'total_marks', 'attempt_limit',
            'questions_count', 'mappings'
        ]


class ExamAttemptSerializer(serializers.ModelSerializer):
    student = UserSerializer(read_only=True)
    exam_details = ExamSerializer(source='exam', read_only=True)
    
    class Meta:
        model = ExamAttempt
        fields = [
            'id', 'exam', 'exam_details', 'student', 'started_at', 'completed_at', 
            'is_submitted', 'raw_score', 'draft_answers'
        ]


class ExamAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAnswer
        fields = ['id', 'attempt', 'question', 'selected_options', 'text_answer', 'is_correct', 'manual_score']

class ExamAntiCheatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAntiCheatLog
        fields = ['id', 'event_type', 'details', 'timestamp']

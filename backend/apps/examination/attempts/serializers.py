from rest_framework import serializers
from django.utils import timezone
from .models import Attempt, Answer
from quizzes.models import Question, Option
from quizzes.serializers import QuestionSerializer, OptionSerializer


class AnswerSerializer(serializers.ModelSerializer):
    """
    Serializer for a student's answer to a question.
    """
    question = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(), write_only=True
    )
    selected_option_id = serializers.IntegerField(write_only=True, required=True)
    is_correct = serializers.BooleanField(read_only=True)
    awarded_marks = serializers.FloatField(read_only=True)
    question_detail = QuestionSerializer(source='question', read_only=True)
    selected_option_detail = OptionSerializer(source='selected_option', read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id', 'question', 'selected_option_id', 'selected_option_detail',
            'is_correct', 'awarded_marks', 'question_detail'
        ]

    def validate(self, attrs):
        question = attrs.get('question')
        selected_option_id = attrs.get('selected_option_id')

        if not question.options.filter(id=selected_option_id).exists():
            raise serializers.ValidationError({
                "selected_option_id": "Invalid option for this question."
            })
        return attrs

    def create(self, validated_data):
        question = validated_data.pop('question')
        selected_option_id = validated_data.pop('selected_option_id')
        selected_option = question.options.get(id=selected_option_id)

        validated_data['question'] = question
        validated_data['selected_option'] = selected_option
        validated_data['is_correct'] = selected_option.is_correct
        validated_data['awarded_marks'] = 1 if selected_option.is_correct else 0

        attempt = self.context.get('attempt')
        if not attempt:
            raise serializers.ValidationError({"attempt": "Attempt context is required."})
        validated_data['attempt'] = attempt

        return super().create(validated_data)


class AttemptSerializer(serializers.ModelSerializer):
    """
    Serializer for a student's quiz attempt.
    Includes nested answers.
    """
    answers = AnswerSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Attempt
        fields = ['id', 'quiz', 'user', 'score', 'completed', 'started_at', 'ended_at', 'answers']
        read_only_fields = ['id', 'user', 'score', 'completed', 'started_at', 'ended_at', 'answers']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        validated_data['started_at'] = timezone.now()
        return super().create(validated_data)

from rest_framework import serializers
from .models import Quiz, Question, Option, Attempt, Answer
from apps.identity.serializers import UserSerializer
from apps.academic.models import Course, Batch
from apps.academic.serializers import BatchSerializer


# -------------------------
# Option Serializer
# -------------------------
class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'is_correct']


# -------------------------
# Question Serializer
# -------------------------
class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['id', 'quiz', 'text', 'marks', 'question_type', 'options']
        extra_kwargs = {'quiz': {'required': False}}

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        for option in options_data:
            Option.objects.create(question=question, **option)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if options_data is not None:
            instance.options.all().delete()
            for option in options_data:
                Option.objects.create(question=instance, **option)
        return instance


# -------------------------
# Quiz Serializer
# -------------------------
class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    course = serializers.PrimaryKeyRelatedField(queryset=Course.objects.all())  # make course writable
    batch = BatchSerializer(read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'course', 'batch', 'teacher', 'title', 'description',
            'duration_minutes', 'start_time', 'end_time', 'anti_cheat_mode',
            'created_at', 'updated_at', 'questions'
        ]
        read_only_fields = ['teacher', 'created_at', 'updated_at']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        # teacher is set in view
        quiz = Quiz.objects.create(**validated_data)

        for question_data in questions_data:
            options_data = question_data.pop('options', [])
            question = Question.objects.create(quiz=quiz, **question_data)
            for option_data in options_data:
                Option.objects.create(question=question, **option_data)

        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if questions_data is not None:
            instance.questions.all().delete()
            for question_data in questions_data:
                options_data = question_data.pop('options', [])
                question = Question.objects.create(quiz=instance, **question_data)
                for option_data in options_data:
                    Option.objects.create(question=question, **option_data)
        return instance


# -------------------------
# Answer Serializer
# -------------------------
class AnswerSerializer(serializers.ModelSerializer):
    question = serializers.PrimaryKeyRelatedField(queryset=Question.objects.all(), write_only=True)
    selected_option_id = serializers.IntegerField(write_only=True, required=True)
    is_correct = serializers.BooleanField(read_only=True)
    awarded_marks = serializers.FloatField(read_only=True)
    question_detail = QuestionSerializer(source='question', read_only=True)

    class Meta:
        model = Answer
        fields = ['id', 'question', 'selected_option_id', 'is_correct', 'awarded_marks', 'question_detail']

    def create(self, validated_data):
        question = validated_data.pop('question')
        selected_option_id = validated_data.pop('selected_option_id')

        try:
            selected_option = question.options.get(id=selected_option_id)
        except Option.DoesNotExist:
            raise serializers.ValidationError({"selected_option_id": "Invalid option for this question."})

        validated_data['question'] = question
        validated_data['selected_option'] = selected_option
        validated_data['is_correct'] = selected_option.is_correct
        validated_data['awarded_marks'] = question.marks if selected_option.is_correct else 0.0

        attempt = self.context.get('attempt')
        if attempt:
            validated_data['attempt'] = attempt

        return super().create(validated_data)

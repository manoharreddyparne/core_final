from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from .models import Quiz, Question, Option, StudentQuizAssignment
from .serializers import QuizSerializer, QuestionSerializer, OptionSerializer
from apps.identity.models import User


class IsTeacherOrAdminAuthenticated(IsAuthenticated):
    """
    Custom permission to allow teachers or admins.
    """
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in [User.Roles.TEACHER, User.Roles.ADMIN]


class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quizzes.
    """
    queryset = Quiz.objects.all().select_related("course", "batch", "teacher").prefetch_related("questions__options")
    serializer_class = QuizSerializer
    permission_classes = [IsTeacherOrAdminAuthenticated]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=['post'])
    def assign_to_batch(self, request, pk=None):
        quiz = self.get_object()
        batch_id = request.data.get("batch_id")
        if not batch_id:
            return Response({"detail": "batch_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        quiz.batch_id = batch_id
        quiz.save()
        return Response({"detail": "Quiz assigned to batch successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def assign_to_student(self, request, pk=None):
        quiz = self.get_object()
        student_id = request.data.get("student_id")
        if not student_id:
            return Response({"detail": "student_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Validate student exists
        try:
            student = User.objects.get(pk=student_id, role=User.Roles.STUDENT)
        except User.DoesNotExist:
            raise ValidationError({"detail": "Student not found or invalid role"})

        # Create assignment if not exists
        assignment, created = StudentQuizAssignment.objects.get_or_create(student=student, quiz=quiz)
        if not created:
            return Response({"detail": "Quiz already assigned to this student"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": f"Quiz assigned to student {student_id} successfully"}, status=status.HTTP_200_OK)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacherOrAdminAuthenticated]

    def get_queryset(self):
        quiz_id = self.kwargs.get("quiz_pk")
        return Question.objects.filter(quiz_id=quiz_id).prefetch_related("options")

    def perform_create(self, serializer):
        quiz_id = self.kwargs.get("quiz_pk")
        serializer.save(quiz_id=quiz_id)


class OptionViewSet(viewsets.ModelViewSet):
    serializer_class = OptionSerializer
    permission_classes = [IsTeacherOrAdminAuthenticated]

    def get_queryset(self):
        question_id = self.kwargs.get("question_pk")
        return Option.objects.filter(question_id=question_id)

    def perform_create(self, serializer):
        question_id = self.kwargs.get("question_pk")
        serializer.save(question_id=question_id)

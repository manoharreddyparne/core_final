from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Attempt, Answer
from .serializers import AttemptSerializer, AnswerSerializer
from anti_cheat.models import AntiCheatLog


class AttemptViewSet(viewsets.ModelViewSet):
    """
    Manage quiz attempts for students.

    Features:
    - Submit answers to questions.
    - Complete attempt to calculate score.
    - Log anti-cheat events with optional auto-submit.
    """
    queryset = Attempt.objects.all()
    serializer_class = AttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own attempts."""
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Create a new attempt if none exists, otherwise return existing attempt.
        """
        quiz_id = request.data.get("quiz")
        if not quiz_id:
            return Response({"detail": "quiz field is required."}, status=status.HTTP_400_BAD_REQUEST)

        attempt, created = Attempt.objects.get_or_create(
            user=request.user,
            quiz_id=quiz_id,
            defaults={'started_at': timezone.now()}
        )

        serializer = self.get_serializer(attempt)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit an answer for a specific question."""
        attempt = self.get_object()

        if attempt.completed:
            return Response({"detail": "This attempt has already been completed."},
                            status=status.HTTP_400_BAD_REQUEST)

        question_id = request.data.get("question")
        selected_option_id = request.data.get("selected_option_id")
        if not question_id or not selected_option_id:
            return Response({"detail": "Both question and selected_option_id are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        if attempt.attempts_answers.filter(question_id=question_id).exists():
            return Response({"detail": "Answer already submitted for this question."},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = AnswerSerializer(data=request.data, context={"attempt": attempt})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            answer = serializer.save(attempt=attempt)
            # Assign marks automatically
            answer.awarded_marks = 1 if answer.is_correct else 0
            answer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def complete_attempt(self, request, pk=None):
        """Mark attempt as completed and calculate total score."""
        attempt = self.get_object()

        if attempt.completed:
            return Response({"detail": "Attempt already completed."}, status=status.HTTP_400_BAD_REQUEST)

        total_score = sum(ans.awarded_marks for ans in attempt.attempts_answers.all())

        with transaction.atomic():
            attempt.score = total_score
            attempt.completed = True
            attempt.ended_at = timezone.now()
            attempt.save()

        serializer = self.get_serializer(attempt)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def anti_cheat_trigger(self, request, pk=None):
        """Log anti-cheat events and optionally auto-submit attempt."""
        attempt = self.get_object()
        event_type = request.data.get("event_type")
        details = request.data.get("details", {})
        auto_submit = bool(request.data.get("auto_submit", False))

        if not event_type:
            return Response({"detail": "event_type is required."}, status=status.HTTP_400_BAD_REQUEST)

        AntiCheatLog.objects.create(user=request.user, quiz=attempt.quiz, event_type=event_type, details=details)

        response_data = {"message": "Anti-cheat event logged."}

        if auto_submit and not attempt.completed:
            total_score = sum(ans.awarded_marks for ans in attempt.attempts_answers.all())
            with transaction.atomic():
                attempt.score = total_score
                attempt.completed = True
                attempt.ended_at = timezone.now()
                attempt.save()
            response_data["auto_submitted"] = True
            response_data["attempt"] = AttemptSerializer(attempt).data

        return Response(response_data, status=status.HTTP_200_OK)

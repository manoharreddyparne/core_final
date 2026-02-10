from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AntiCheatLog
from .serializers import AntiCheatLogSerializer
from apps.quizzes.models import Quiz

class AntiCheatLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet to log and retrieve anti-cheat events.
    """
    queryset = AntiCheatLog.objects.all()
    serializer_class = AntiCheatLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Users can see only their own logs.
        Teachers/admin can override if needed.
        """
        user = self.request.user
        # Extend here for teacher/admin view if required
        return self.queryset.filter(user=user)

    @action(detail=False, methods=['post'])
    def log_event(self, request):
        """
        Endpoint for frontend to log anti-cheat events.
        Expected JSON payload:
        {
            "quiz_id": 1,
            "event_type": "TAB_SWITCH",
            "details": {"tab_lost_count": 2}
        }
        """
        user = request.user
        quiz_id = request.data.get("quiz_id")
        event_type = request.data.get("event_type")
        details = request.data.get("details", {})

        if not quiz_id or not event_type:
            return Response({"detail": "quiz_id and event_type are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quiz = Quiz.objects.get(id=quiz_id)
        except Quiz.DoesNotExist:
            return Response({"detail": "Quiz not found."}, status=status.HTTP_404_NOT_FOUND)

        log = AntiCheatLog.objects.create(
            user=user,
            quiz=quiz,
            event_type=event_type,
            details=details
        )
        serializer = self.get_serializer(log)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

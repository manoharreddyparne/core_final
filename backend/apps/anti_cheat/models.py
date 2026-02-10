from django.db import models
from django.conf import settings
from apps.quizzes.models import Quiz

class AntiCheatLog(models.Model):
    EVENT_CHOICES = [
        ('TAB_SWITCH', 'Tab Switch'),
        ('ESC_PRESS', 'ESC Press'),
        ('FOCUS_LOST', 'Focus Lost'),
        ('OTHER', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="anti_cheat_logs"
    )
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_CHOICES
    )
    details = models.JSONField(default=dict, blank=True)  # Django 4.2+ built-in JSONField
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "AntiCheat Log"
        verbose_name_plural = "AntiCheat Logs"

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.event_type}"

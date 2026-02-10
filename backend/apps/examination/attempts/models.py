from django.db import models
from django.conf import settings
from quizzes.models import Quiz, Question, Option


class Attempt(models.Model):
    """
    Represents a student's attempt at a quiz in the attempts app.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attempts_user_attempts"
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="attempts_quiz_attempts"
    )
    score = models.PositiveIntegerField(default=0)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']
        unique_together = ('user', 'quiz')

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title}"


class Answer(models.Model):
    attempt = models.ForeignKey(
        Attempt,
        related_name="attempts_answers",
        on_delete=models.CASCADE
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers"
    )
    selected_option = models.ForeignKey(
        Option,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    text_answer = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    awarded_marks = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("attempt", "question")

    def __str__(self):
        return f"Answer by {self.attempt.user.username} for {self.question.text[:30]}"

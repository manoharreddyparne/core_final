from django.db import models
from courses.models import Course, Batch
from users.models import User
from django.utils import timezone


class Quiz(models.Model):
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="quizzes"
    )
    batch = models.ForeignKey(
        Batch,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="quizzes"
    )
    teacher = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        limit_choices_to={"role": User.Roles.TEACHER},
        related_name="quizzes_created"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=30)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    anti_cheat_mode = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Quiz"
        verbose_name_plural = "Quizzes"

    def __str__(self):
        return f"{self.title} ({self.course.name})"


class Question(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        related_name='questions',
        on_delete=models.CASCADE
    )
    text = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=[
            ('MCQ', 'Multiple Choice'),
            ('TrueFalse', 'True/False'),
            ('ShortAnswer', 'Short Answer'),
        ],
        default='MCQ'
    )
    marks = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["id"]
        verbose_name = "Question"
        verbose_name_plural = "Questions"

    def __str__(self):
        return self.text[:50]


class Option(models.Model):
    question = models.ForeignKey(
        Question,
        related_name='options',
        on_delete=models.CASCADE
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Option"
        verbose_name_plural = "Options"

    def __str__(self):
        return self.text[:50]


class Attempt(models.Model):
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name="quizzes_attempts"
    )
    student = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={"role": User.Roles.STUDENT},
        related_name="quizzes_student_attempts"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(default=0.0)
    is_submitted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("quiz", "student")
        ordering = ["-started_at"]

    def __str__(self):
        return f"Attempt by {self.student.username} on {self.quiz.title}"


class Answer(models.Model):
    attempt = models.ForeignKey(
        Attempt,
        on_delete=models.CASCADE,
        related_name="quizzes_answers"
    )
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="quizzes_answers"
    )
    selected_option = models.ForeignKey(
        Option,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes_chosen_answers"
    )
    text_answer = models.TextField(blank=True, null=True)
    is_correct = models.BooleanField(default=False)
    awarded_marks = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("attempt", "question")
        ordering = ["question"]

    def __str__(self):
        return f"Answer for {self.question.text[:30]} by {self.attempt.student.username}"


# -------------------------
# StudentQuizAssignment
# -------------------------
class StudentQuizAssignment(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': User.Roles.STUDENT})
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('student', 'quiz')
        verbose_name = "Student Quiz Assignment"
        verbose_name_plural = "Student Quiz Assignments"

    def __str__(self):
        return f"{self.student.email} -> {self.quiz.title}"

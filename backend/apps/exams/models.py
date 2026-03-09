from django.db import models
from django.conf import settings
from apps.academic.models import Course, Batch
from apps.identity.models import User
from django.utils import timezone
import uuid


class Exam(models.Model):
    """
    Unified model for Mock Tests and Online Exams.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="exams")
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, null=True, blank=True, related_name="exams")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="exams_created")
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    is_mock = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(default=60)
    
    start_time = models.DateTimeField(null=True, blank=True, help_text="Start of availability window")
    end_time = models.DateTimeField(null=True, blank=True, help_text="End of availability window")
    
    anti_cheat_enabled = models.BooleanField(default=False)
    randomize_questions = models.BooleanField(default=True)
    
    pass_marks = models.PositiveIntegerField(default=40)
    total_marks = models.PositiveIntegerField(default=100)
    attempt_limit = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.course.name}"


class QuestionBank(models.Model):
    """
    Reusable question pool.
    """
    DIFFICULTY_CHOICES = [
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard'),
    ]
    QUESTION_TYPE_CHOICES = [
        ('MCQ', 'Multiple Choice'),
        ('MULTI_SELECT', 'Multiple Select'),
        ('SHORT_ANSWER', 'Short Answer'),
    ]
    
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='MCQ')
    
    topic = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    
    default_marks = models.PositiveIntegerField(default=1)
    
    # Generic metadata for tag-based filtering
    tags = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.question_type}] {self.text[:50]}"


class QuestionOption(models.Model):
    """
    Options for MCQ/Multi-select questions.
    """
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name="options")
    text = models.TextField()
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.text[:50]} ({'Correct' if self.is_correct else 'Wrong'})"


class ExamQuestionMapping(models.Model):
    """
    Specific questions assigned to an exam.
    """
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="questions")
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)
    marks_override = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ('exam', 'question')


class ExamAttempt(models.Model):
    """
    Student's instance of an exam session.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exam_attempts")
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    is_submitted = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='STARTED') # STARTED, IN_PROGRESS, SUBMITTED, EVALUATED
    
    raw_score = models.FloatField(default=0.0)
    ai_evaluation_summary = models.TextField(blank=True, null=True)
    violation_score = models.IntegerField(default=0) # Sum of gravity of anti-cheat logs
    
    # JSON to auto-save state (current question index, etc.)
    draft_answers = models.JSONField(default=dict, blank=True)

    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    browser_fingerprint = models.CharField(max_length=255, blank=True, null=True)


    def __str__(self):
        return f"{self.student.email} @ {self.exam.title}"


class ExamAnswer(models.Model):
    """
    Individual answers submitted by a student.
    """
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(ExamQuestionMapping, on_delete=models.CASCADE)
    
    # For MCQ/Multi-select
    selected_options = models.ManyToManyField(QuestionOption, blank=True)
    
    # For Short Answer
    text_answer = models.TextField(blank=True, null=True)
    
    is_correct = models.BooleanField(default=False)
    manual_score = models.FloatField(null=True, blank=True)
    
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="graded_answers")
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('attempt', 'question')


class ExamAntiCheatLog(models.Model):
    """
    Tracks browser events during an exam.
    """
    EVENT_CHOICES = [
        ('TAB_SWITCH', 'Tab Switch'),
        ('WINDOW_BLUR', 'Window Lost Focus'),
        ('FULLSCREEN_EXIT', 'Fullscreen Exit'),
        ('ESCAPE', 'Escape Key Pressed'),
    ]
    
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name="anti_cheat_logs")
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

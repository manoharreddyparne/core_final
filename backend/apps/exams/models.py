from django.db import models
from django.conf import settings
from apps.academic.models import Course, Batch
from apps.identity.models import User
from django.utils import timezone
import uuid


class Exam(models.Model):
    """
    Unified model for Mock Tests and Online Exams with advanced security.
    """
    DEVICE_CHOICES = [
        ('ANY', 'Any Device'),
        ('LAPTOP_ONLY', 'Laptop/Desktop Only'),
    ]

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="exams")
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, null=True, blank=True, related_name="exams")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="exams_created")
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    is_mock = models.BooleanField(default=False)
    duration_minutes = models.PositiveIntegerField(default=60)
    
    start_time = models.DateTimeField(null=True, blank=True, help_text="Start of availability window")
    end_time = models.DateTimeField(null=True, blank=True, help_text="End of availability window")
    
    # Advanced Security Toggles
    anti_cheat_enabled = models.BooleanField(default=False)
    strict_mode = models.BooleanField(default=False, help_text="Auto-terminate exam on reaching violation threshold")
    violation_threshold = models.PositiveIntegerField(default=5)
    
    enable_webcam = models.BooleanField(default=False)
    enable_microphone = models.BooleanField(default=False)
    
    device_restriction = models.CharField(max_length=20, choices=DEVICE_CHOICES, default='LAPTOP_ONLY')
    allow_resume = models.BooleanField(default=True, help_text="Allow students to resume if disconnected")
    
    randomize_questions = models.BooleanField(default=True)
    show_results_immediately = models.BooleanField(default=False, help_text="If false, results withheld until end_time")
    
    pass_marks = models.PositiveIntegerField(default=40)
    total_marks = models.PositiveIntegerField(default=100)
    attempt_limit = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} - {self.course.name}"


class ExamSection(models.Model):
    """
    Allows splitting an exam into sections (e.g. Aptitude, Technical).
    """
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="sections")
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.exam.title} - {self.title}"


class QuestionBank(models.Model):
    """
    Reusable question pool including coding and scenario-based types.
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
        ('CODING', 'Coding/Lab'),
        ('APTITUDE', 'Aptitude/Logical'),
    ]
    
    text = models.TextField(help_text="Detailed problem description or scenario")
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, default='MCQ')
    
    topic = models.CharField(max_length=100, blank=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    
    default_marks = models.PositiveIntegerField(default=1)
    
    # Coding specifics
    coding_metadata = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="Test cases, boilerplate code, memory/time limits"
    )
    
    # Multi-tenant / Institutional grouping
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
    Specific questions assigned to an exam section.
    """
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="mappings")
    section = models.ForeignKey(ExamSection, on_delete=models.CASCADE, null=True, blank=True, related_name="questions")
    question = models.ForeignKey(QuestionBank, on_delete=models.CASCADE)
    marks_override = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

class ExamAttempt(models.Model):
    """
    Student's instance of an exam session with session hardening.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name="attempts")
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name="exam_attempts")
    
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    is_submitted = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    blocked_reason = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, default='STARTED') # STARTED, IN_PROGRESS, SUBMITTED, EVALUATED
    
    raw_score = models.FloatField(default=0.0)
    ai_evaluation_summary = models.TextField(blank=True, null=True)
    violation_score = models.IntegerField(default=0) 
    
    draft_answers = models.JSONField(default=dict, blank=True)
    
    # Session Hardening
    session_key = models.CharField(max_length=100, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    browser_fingerprint = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.student.email} @ {self.exam.title}"


class ExamAnswer(models.Model):
    """
    Individual answers including code submissions.
    """
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name="answers")
    question_mapping = models.ForeignKey(ExamQuestionMapping, on_delete=models.CASCADE)
    
    # For MCQ
    selected_options = models.ManyToManyField(QuestionOption, blank=True)
    
    # For Short Answer / Coding
    text_answer = models.TextField(blank=True, null=True, help_text="Can hold code or descriptive text")
    
    # Evaluation
    is_correct = models.BooleanField(default=False)
    manual_score = models.FloatField(null=True, blank=True)
    compilation_data = models.JSONField(default=dict, blank=True, help_text="Output from sandbox executor")
    
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="graded_answers")
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('attempt', 'question_mapping')


class ExamAntiCheatLog(models.Model):
    """
    Tracks forensic evidence during exam.
    """
    EVENT_CHOICES = [
        ('TAB_SWITCH', 'Tab Switch'),
        ('WINDOW_BLUR', 'Window Lost Focus'),
        ('FULLSCREEN_EXIT', 'Fullscreen Exit'),
        ('DEV_TOOLS_DETECTED', 'Developer Tools Detected'),
        ('SNAPSHOT_AI_VIOLATION', 'AI Snapshot Violation'),
        ('DEVICE_CHANGE', 'Attempted Device Change'),
    ]
    
    attempt = models.ForeignKey(ExamAttempt, on_delete=models.CASCADE, related_name="anti_cheat_logs")
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    evidence_image_url = models.URLField(blank=True, null=True) # For S3 snapshots
    
    # AI/ML Training Feedback Loop
    is_verified = models.BooleanField(default=False, help_text="Set by faculty to confirm violation")
    faculty_feedback = models.TextField(blank=True, null=True, help_text="Reasoning for verification/falsification")
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']


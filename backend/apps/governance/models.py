from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry
from django.utils.text import slugify

class GovernancePolicy(models.Model):
    """
    Defines policies that control user features based on their behavior or profile.
    Example: 'If Behavior Score < 40, Disable Placement Apply'
    """
    name = models.CharField(max_length=255)
    code = models.SlugField(unique=True)
    description = models.TextField()
    
    # Policy Logic (JSON structure for rule evaluation)
    conditions = models.JSONField(help_text="e.g. {'readiness_score_min': 40, 'activity_days_min': 5}")
    actions = models.JSONField(help_text="e.g. {'allow_placement': true, 'require_mock': true}")
    
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=1)

    def __str__(self):
        return f"Policy: {self.name}"

class StudentBehaviorLog(models.Model):
    """
    Captures every atomic operation a student performs.
    Used for content-based and collaborative recommendation training.
    """
    EVENT_TYPES = [
        ('PAGE_VIEW', 'Page View'),
        ('CLICK', 'Button/Link Click'),
        ('SEARCH', 'Search Query'),
        ('QUIZ_START', 'Started Quiz'),
        ('BLOG_READ', 'Read Blog Post'),
        ('RESUME_BUILD', 'Editing Resume'),
        ('COMMUNICATION', 'Chat/Message Sent'),
    ]

    student = models.ForeignKey(StudentAcademicRegistry, on_delete=models.CASCADE, related_name='behavior_logs')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    
    # Context data (what did they click? what did they search?)
    target_id = models.CharField(max_length=255, blank=True, help_text="ID of the object interacted with")
    target_type = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Temporal tracking
    timestamp = models.DateTimeField(auto_now_add=True)
    duration_seconds = models.IntegerField(default=0)
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['student', 'event_type']),
            models.Index(fields=['timestamp']),
        ]

class GovernanceBrainState(models.Model):
    """
    Persists the state of the Governance Brain (Model weights, training metadata).
    Supports the 'Retraining automatically' requirement.
    """
    model_version = models.CharField(max_length=50, unique=True)
    weights_metadata = models.JSONField(help_text="Serialized weights or hyperparameters for the behavioral engine")
    
    accuracy_score = models.FloatField(default=0.0)
    samples_trained = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Brain Version: {self.model_version}"

class StudentIntelligenceProfile(models.Model):
    """
    The 'Content Matrix' for the student.
    Aggregates behavior into a structured profile for the Governance Brain.
    """
    student = models.OneToOneField(StudentAcademicRegistry, on_delete=models.CASCADE, related_name='intel_profile')
    
    # Scores
    behavior_score = models.IntegerField(default=70, help_text="Derived from active usage")
    readiness_score = models.IntegerField(default=50, help_text="Placement readiness (0-100)")
    risk_factor = models.FloatField(default=0.0, help_text="0.0 to 1.0 probability of policy violation")
    
    # Content Matrix (Interests & Skills Mappings)
    interest_matrix = models.JSONField(default=dict, help_text="Weighted interests based on behavior logs")
    skill_matrix = models.JSONField(default=dict, help_text="Verified skills + implied skills from activities")
    
    # Feature Controls (derived by Governance Brain using Policies)
    active_controls = models.JSONField(default=dict, help_text="Enabled/Disabled features based on policies")
    manual_overrides = models.JSONField(default=dict, help_text="Policy overrides by faculty")
    
    last_computed = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Intelligence Profile: {self.student.roll_number}"

class Blog(models.Model):
    """
    Institutional Blog Posts for knowledge sharing, updates, and student engagement.
    Re-engineered for 'LinkedIn-like' features (Media, Text, Video).
    """
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    content = models.TextField()
    
    # Media Support (Saved Locally in /media/blogs/)
    media_file = models.FileField(upload_to='blogs/%Y/%m/', blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=[('IMAGE', 'Image'), ('VIDEO', 'Video'), ('NONE', 'None')], default='NONE')
    
    author_id = models.IntegerField(help_text="ID of the Faculty/Admin/Student posting")
    author_role = models.CharField(max_length=50, choices=[('FACULTY', 'Faculty'), ('ADMIN', 'Admin'), ('STUDENT', 'Student')])
    
    tags = models.JSONField(default=list, blank=True)
    is_published = models.BooleanField(default=False)
    
    # Engagement Counters
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

class BlogLike(models.Model):
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='likes')
    user_id = models.IntegerField()
    user_role = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blog', 'user_id', 'user_role')

class BlogComment(models.Model):
    blog = models.ForeignKey(Blog, on_delete=models.CASCADE, related_name='comments')
    user_id = models.IntegerField()
    user_role = models.CharField(max_length=20)
    user_name = models.CharField(max_length=255)
    
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    created_at = models.DateTimeField(auto_now_add=True)

class MediaAttachment(models.Model):
    """
    Supports media for blogs or posts. Saved in /media/uploads/
    """
    file = models.FileField(upload_to='uploads/%Y/%m/', null=True, blank=True)
    file_type = models.CharField(max_length=50, null=True, blank=True) # image/png, video/mp4
    uploaded_by_id = models.IntegerField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Newsletter(models.Model):
    """
    Institutional Newsletters for official updates.
    """
    month = models.CharField(max_length=20)
    year = models.IntegerField()
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, null=True)
    cover_image = models.ImageField(upload_to='newsletters/', blank=True, null=True)
    content_html = models.TextField()
    
    category = models.CharField(max_length=50, default='INSTITUTIONAL')
    status = models.CharField(max_length=20, choices=[('DRAFT', 'Draft'), ('SENT', 'Sent')], default='DRAFT')
    
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.title}-{self.month}-{self.year}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} - {self.month} {self.year}"

class DocumentTemplate(models.Model):
    name = models.CharField(max_length=255)
    content_structure = models.TextField()
    category = models.CharField(max_length=100, default='PLACEMENT')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

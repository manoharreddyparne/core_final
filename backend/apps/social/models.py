from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry
import uuid

class SocialPost(models.Model):
    """
    Student/Faculty posts for the institutional professional hub.
    Aligned with the 'LinkedIn-style' requirement.
    """
    author_id = models.IntegerField(db_index=True)
    author_role = models.CharField(max_length=20) # STUDENT, FACULTY
    author_name = models.CharField(max_length=255)
    
    content = models.TextField()
    
    # Rich Media (Saved locally in /media/posts/)
    media_file = models.FileField(upload_to='posts/%Y/%m/', blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=[('IMAGE', 'Image'), ('VIDEO', 'Video'), ('NONE', 'None')], default='NONE')
    
    # Engagement (Denormalized)
    likes_count = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    shares_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SocialLike(models.Model):
    post = models.ForeignKey(SocialPost, on_delete=models.CASCADE, related_name='likes')
    user_id = models.IntegerField()
    user_role = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user_id', 'user_role')

class SocialComment(models.Model):
    post = models.ForeignKey(SocialPost, on_delete=models.CASCADE, related_name='comments')
    user_id = models.IntegerField()
    user_role = models.CharField(max_length=20)
    user_name = models.CharField(max_length=255)
    
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Connection(models.Model):
    """
    Following graph for professional networking.
    """
    follower_id = models.IntegerField(db_index=True)
    follower_role = models.CharField(max_length=20)
    
    following_id = models.IntegerField(db_index=True)
    following_role = models.CharField(max_length=20)
    
    # Status: PENDING (for Connect), ACCEPTED (Default for Follow)
    status = models.CharField(max_length=20, default='ACCEPTED')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower_id', 'follower_role', 'following_id', 'following_role')

class ChatSession(models.Model):
    """
    Metadata for 1-on-1 or group chats.
    """
    session_id = models.UUIDField(unique=True, db_index=True, default=uuid.uuid4)
    institution_id = models.IntegerField(null=True, blank=True)
    participants = models.JSONField(help_text="List of {id, role} participants")
    
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True, help_text="For group chats")
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)

class ChatMessage(models.Model):
    """
    Persistent history for chats.
    """
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    sender_id = models.IntegerField()
    sender_role = models.CharField(max_length=20)
    
    content = models.TextField()
    attachment_file = models.FileField(upload_to='chats/', blank=True, null=True)
    
    received = models.BooleanField(default=False)
    read = models.BooleanField(default=False)
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

class SupportTicket(models.Model):
    """
    Self-healing support system as requested.
    Automated bug fixes and issue solves logic tracked here.
    """
    student = models.ForeignKey(StudentAcademicRegistry, on_delete=models.CASCADE, null=True, blank=True)
    faculty = models.ForeignKey(FacultyAcademicRegistry, on_delete=models.CASCADE, null=True, blank=True)
    
    subject = models.CharField(max_length=255)
    description = models.TextField()
    
    status = models.CharField(
        max_length=20, 
        choices=[('OPEN', 'Open'), ('AI_SCANNING', 'AI Analyzing'), ('RESOLVED', 'Resolved')],
        default='OPEN'
    )
    
    ai_diagnosis = models.TextField(blank=True, help_text="AI's automated analysis of the issue")
    automated_fix_applied = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

"""
Student Invitation Model - Tracks activation links sent to students
"""

import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.identity.models.core_models import CoreStudent


class StudentInvitation(models.Model):
    """
    Stores activation tokens for institution-seeded students.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(
        CoreStudent,
        on_delete=models.CASCADE,
        related_name='invitation',
        help_text="The core student record this invitation belongs to"
    )
    
    token = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Secure activation token"
    )
    
    sent_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(help_text="Token expiration time")
    
    is_used = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'student_invitations'
        verbose_name = 'Student Invitation'
        verbose_name_plural = 'Student Invitations'
    
    def __str__(self):
        return f"Invite for {self.student.stu_ref} (Exp: {self.expires_at})"
    
    @property
    def is_expired(self):
        """Check if token is expired"""
        return timezone.now() > self.expires_at or self.is_used

    def save(self, *args, **kwargs):
        """Set expiration if not provided (default 48 hours)"""
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

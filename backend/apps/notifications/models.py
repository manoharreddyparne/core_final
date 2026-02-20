from django.db import models
from django.conf import settings

class Notification(models.Model):
    """
    Individual notifications for users (Students, Faculty, Admins).
    Supports in-app alerts and can be used to track communication history.
    """
    TYPE_CHOICES = [
        ('SYSTEM', 'System Alert'),
        ('PLACEMENT', 'Placement Update'),
        ('ACADEMIC', 'Academic Alert'),
        ('COMMUNICATION', 'Centralized Message'),
        ('BLOG', 'New Blog Post'),
        ('NEWSLETTER', 'Newsletter'),
    ]

    # recipient links to the core User model (Public schema)
    # Note: Even in tenant schema, we can link to public User
    recipient_id = models.IntegerField(db_index=True) # ID of User in public schema
    
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='SYSTEM')
    
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Contextual links
    link_url = models.CharField(max_length=512, blank=True, help_text="Action URL for the notification")
    
    def __str__(self):
        return f"User {self.recipient_id} - {self.title}"

class Announcement(models.Model):
    """
    Broad messages published by TPOs or University Admins.
    Targeted towards groups within an institution.
    """
    TARGET_CHOICES = [
        ('ALL', 'All Members'),
        ('STUDENTS', 'All Students'),
        ('FACULTY', 'All Faculty'),
        ('ELIGIBLE', 'Eligible Students (Drive-Specific)'),
        ('APPLIED', 'Applied Students (Drive-Specific)'),
    ]

    title = models.CharField(max_length=255)
    content = models.TextField()
    target_group = models.CharField(max_length=20, choices=TARGET_CHOICES, default='ALL')
    
    # For Drive-specific announcements (Eligibility/Applied targeted)
    drive_id = models.IntegerField(null=True, blank=True, help_text="ID of the related placement drive")
    
    importance = models.IntegerField(default=1, help_text="1: Normal, 2: High, 3: Urgent")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

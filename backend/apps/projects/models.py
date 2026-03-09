from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry
import uuid

class StudentProject(models.Model):
    """
    Model for students to upload and share their projects, documentation, PPTs, and research papers.
    """
    CATEGORY_CHOICES = [
        ('DOCUMENTATION', 'Project Documentation'),
        ('PPT', 'Presentation (PPT)'),
        ('RESEARCH_PAPER', 'Research Paper'),
        ('OTHER', 'Other Attachment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(StudentAcademicRegistry, on_delete=models.CASCADE, related_name='projects')
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, help_text="Short description or overview")
    abstract = models.TextField(blank=True, help_text="Detailed project abstract")
    
    group_name = models.CharField(max_length=255, blank=True, null=True)
    batch_id = models.CharField(max_length=50, blank=True, null=True)
    
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='DOCUMENTATION')
    
    # Files
    file = models.FileField(upload_to='projects/submissions/%Y/%m/', help_text="Main Project Submission/Source Code", blank=True, null=True)
    documentation_file = models.FileField(upload_to='projects/docs/%Y/%m/', blank=True, null=True)
    research_paper = models.FileField(upload_to='projects/research/%Y/%m/', blank=True, null=True)
    project_link = models.URLField(max_length=500, blank=True, null=True, help_text="External link (GitHub, Live Demo, etc.)")
    
    # Research Specific Metadata (IJRSI Workflow)
    keywords = models.CharField(max_length=500, blank=True, help_text="Comma separated keywords")
    co_authors = models.CharField(max_length=500, blank=True, help_text="Comma separated co-author names")
    department = models.ForeignKey('academic.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='department_projects')
    research_area = models.CharField(max_length=255, blank=True, help_text="e.g. Artificial Intelligence, Mechanical Engineering")
    publication_date = models.DateField(null=True, blank=True)
    
    # Approval Workflow
    is_approved = models.BooleanField(default=False)
    approved_by_id = models.IntegerField(null=True, blank=True) # ID of faculty who approved
    
    # Metadata
    views_count = models.IntegerField(default=0)
    likes_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.group_name or self.student.full_name}"

class ProjectLike(models.Model):
    """
    Tracks likes for projects to encourage engagement.
    """
    project = models.ForeignKey(StudentProject, on_delete=models.CASCADE, related_name='likes')
    user_id = models.IntegerField()
    user_role = models.CharField(max_length=20) # STUDENT, FACULTY, ADMIN
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user_id', 'user_role')

class ProjectFeedback(models.Model):
    """
    Model for faculty members to provide feedback on student projects.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('REQUESTED_CHANGES', 'Changes Requested'),
        ('VERIFIED', 'Verified / Approved'),
        ('EXCELLENT', 'Outstanding / Featured'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(StudentProject, on_delete=models.CASCADE, related_name='feedback_entries')
    
    faculty_id = models.IntegerField() # Global User ID
    faculty_name = models.CharField(max_length=255)
    
    comment = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback for {self.project.title} by {self.faculty_name}"


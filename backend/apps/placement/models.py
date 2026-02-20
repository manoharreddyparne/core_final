from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry

class PlacementDrive(models.Model):
    """
    Represents a job opening or placement activity by a company.
    Tenant-scoped (Isolation enforced by django-tenants).
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('ACTIVE', 'Active (Accepting Applications)'),
        ('CLOSED', 'Closed'),
        ('RESULTS', 'Results Announced'),
    ]

    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    job_description = models.TextField()
    package_details = models.CharField(max_length=255, help_text="e.g., 12 LPA")
    location = models.CharField(max_length=255, blank=True)
    
    deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Eligibility Criteria (Simplified for US-4.1, logic in US-4.2)
    min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    min_10th_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)
    min_12th_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)
    eligible_branches = models.JSONField(default=list, help_text="List of eligible branch names (e.g. ['CSE', 'IT'])")
    eligible_batches = models.JSONField(default=list, help_text="List of eligible batch years (e.g. [2024, 2025])")
    
    other_requirements = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.company_name} - {self.role}"

class PlacementApplication(models.Model):
    """
    Link between an Activated Student and a Placement Drive.
    """
    STATUS_CHOICES = [
        ('APPLIED', 'Applied'),
        ('SHORTLISTED', 'Shortlisted'),
        ('REJECTED', 'Rejected'),
        ('PLACED', 'Placed'),
    ]

    drive = models.ForeignKey(PlacementDrive, on_delete=models.CASCADE, related_name='applications')
    # Link to Academic Registry as it's the primary student identity in the tenant
    student = models.ForeignKey(StudentAcademicRegistry, on_delete=models.CASCADE, related_name='placements')
    
    resume_url = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='APPLIED')
    
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('drive', 'student')

class PlacementProcessStage(models.Model):
    """
    Advanced ATS Stage Tracking for a specific application.
    Tracks 'Online Test', 'Technical Interview', 'HR Interview', etc.
    """
    STAGES = [
        ('SCREENING', 'Resume Screening'),
        ('TEST', 'Online Technical Test'),
        ('GD', 'Group Discussion'),
        ('TECH_INT', 'Technical Interview'),
        ('HR_INT', 'HR Interview'),
        ('OFFER', 'Offer Extended'),
    ]

    application = models.ForeignKey(PlacementApplication, on_delete=models.CASCADE, related_name='stages')
    stage_name = models.CharField(max_length=50, choices=STAGES)
    
    status = models.CharField(
        max_length=20, 
        choices=[('PENDING', 'Pending'), ('CLEARED', 'Cleared'), ('FAILED', 'Failed')],
        default='PENDING'
    )
    
    feedback = models.TextField(blank=True, help_text="AI or Interviewer feedback")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['application', 'id']

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
    location = models.CharField(max_length=255, blank=True, help_text="e.g. Hyderabad, Remote")
    experience_years = models.CharField(max_length=100, blank=True, help_text="e.g. 0-2 Years, Freshers Only")
    qualifications = models.JSONField(default=list, help_text="e.g. ['B.Tech', 'M.Tech']")
    salary_range = models.CharField(max_length=255, blank=True, help_text="e.g. 4.5 - 7.5 LPA")
    contact_details = models.JSONField(default=list, help_text="Emails/Phone numbers found in JD")
    hiring_process = models.JSONField(default=list, help_text="Steps: e.g. ['Online Test', 'Technical Interview']")
    custom_criteria = models.JSONField(default=dict, blank=True, help_text="Dynamic/Manual fields like 'Inter Percent', 'Backlog Policy'")
    
    deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Eligibility Criteria (Advanced & Governed)
    min_cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    min_ug_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)
    cgpa_to_percentage_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=9.5, help_text="Used dynamically to convert CGPA to %")
    min_10th_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)
    min_12th_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, null=True, blank=True)
    allowed_active_backlogs = models.IntegerField(default=0)
    eligible_branches = models.JSONField(default=list, help_text="List of eligible branch names (e.g. ['CSE', 'IT'])")
    eligible_batches = models.JSONField(default=list, help_text="List of eligible batch years (e.g. [2024, 2025])")
    
    # Manifest Refinements (Manual Overrides)
    excluded_rolls = models.JSONField(default=list, blank=True, help_text="List of roll numbers explicitly excluded from this drive")
    manual_students = models.JSONField(default=list, blank=True, help_text="List of roll numbers explicitly added to this drive")

    
    other_requirements = models.TextField(blank=True)
    jd_document = models.FileField(upload_to='placements/jds/', null=True, blank=True)
    # Intelligence & Social
    is_broadcasted = models.BooleanField(default=False)
    chat_session_id = models.UUIDField(null=True, blank=True, help_text="Linked ChatSession ID")
    neural_metadata = models.JSONField(default=dict, blank=True, help_text="Dynamic AI components (skills, blurbs, roles)")

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

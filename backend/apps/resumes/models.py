from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry

class ResumeTemplate(models.Model):
    """
    Configuration for 1000+ templates.
    Stored as variant metadata.
    """
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, help_text="e.g. Minimalist, Creative, Engineering, etc.")
    thumbnail_url = models.URLField(blank=True, null=True)
    
    # Structure definition (JSON config for frontend components mapping)
    layout_config = models.JSONField(help_text="Defines sections and their ordering for this template")
    
    css_override = models.TextField(blank=True, help_text="Template specific styles")
    
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

class StudentResume(models.Model):
    """
    Student's dynamic resume instance.
    Uses RAG context to help build/customize.
    """
    student = models.ForeignKey(StudentAcademicRegistry, on_delete=models.CASCADE, related_name='resumes')
    template = models.ForeignKey(ResumeTemplate, on_delete=models.SET_NULL, null=True, blank=True)
    
    resume_name = models.CharField(max_length=255, default="My Resume")
    
    # Content Storage (Dynamic structure)
    personal_info = models.JSONField(default=dict)
    education = models.JSONField(default=list)
    experience = models.JSONField(default=list)
    projects = models.JSONField(default=list)
    skills = models.JSONField(default=list)
    awards = models.JSONField(default=list)
    
    # AI Customization Flags (RAG driven)
    is_ai_optimized = models.BooleanField(default=False)
    last_ai_optimization = models.DateTimeField(null=True, blank=True)
    
    # Final Output
    pdf_url = models.URLField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.student.roll_number} - {self.resume_name}"

class ResumeCustomizationAudit(models.Model):
    """
    Tracks how students use the RAG features to modify their resumes for specific companies.
    """
    resume = models.ForeignKey(StudentResume, on_delete=models.CASCADE)
    target_jd = models.TextField(help_text="The job description the student is tailoring for")
    
    ai_suggestions_applied = models.JSONField(default=list)
    ats_score_before = models.IntegerField(default=0)
    ats_score_after = models.IntegerField(default=0)
    
    timestamp = models.DateTimeField(auto_now_add=True)

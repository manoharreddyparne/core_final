from django.db import models

class InstitutionInterest(models.Model):
    """
    Captures interest from students whose institutions are not yet on the platform.
    Used for business development and outreach.
    """
    student_name = models.CharField(max_length=255)
    student_email = models.EmailField()
    institution_name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True, null=True)
    hod_name = models.CharField(max_length=255, blank=True, null=True)
    hod_designation = models.CharField(max_length=100, blank=True, null=True)
    hod_email = models.EmailField(blank=True, null=True)
    
    additional_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Track status for follow-up
    is_reviewed = models.BooleanField(default=False)
    admin_notes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Institution Interests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.institution_name} - {self.student_name}"

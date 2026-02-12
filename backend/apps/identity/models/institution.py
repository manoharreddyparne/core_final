from django.db import models
from apps.identity.models.core_models import CoreStudent, User

class Institution(models.Model):
    """
    Represents an educational institution (College/University) on the platform.
    Supports multi-tenancy via dynamic schema creation.
    """
    class RegistrationStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        REVIEW = "REVIEW", "Under Review"
        MORE_INFO = "MORE_INFO", "More Info Requested"

    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    domain = models.CharField(max_length=255, unique=True, help_text="Institution email domain (e.g., mit.edu)")
    address = models.TextField(blank=True)
    contact_email = models.EmailField()
    contact_number = models.CharField(max_length=20, blank=True)
    logo_url = models.URLField(blank=True, null=True)
    
    # Approval Flow
    status = models.CharField(
        max_length=20, 
        choices=RegistrationStatus.choices, 
        default=RegistrationStatus.PENDING
    )
    registration_data = models.JSONField(
        null=True, 
        blank=True, 
        help_text="Detailed registration application data"
    )
    student_count_estimate = models.IntegerField(default=0)
    
    # Multi-tenancy
    schema_name = models.CharField(
        max_length=63, 
        unique=True, 
        null=True, 
        blank=True, 
        help_text="Database schema name for this institution"
    )
    is_setup_complete = models.BooleanField(default=False)

    # Subscription/Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

class InstitutionAdmin(models.Model):
    """
    Profile for institution-level administrators.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="institution_admin_profile")
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="admins")
    role_description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.institution.name} Admin"

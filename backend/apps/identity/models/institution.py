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

    # Verifiable Certificate (X.509 PKI)
    import uuid
    certificate_id          = models.UUIDField(null=True, blank=True, unique=True, default=None, help_text="Verifiable certificate identifier")
    certificate_issued_at   = models.DateTimeField(null=True, blank=True)
    certificate_expires_at  = models.DateTimeField(null=True, blank=True)
    certificate_url         = models.URLField(max_length=500, blank=True, null=True, help_text="URL to the generated PDF certificate")
    certificate_serial      = models.CharField(max_length=128, blank=True, null=True, help_text="X.509 serial number (hex)")
    certificate_fingerprint = models.CharField(max_length=256, blank=True, null=True, help_text="SHA-256 fingerprint of the X.509 certificate")

    # ── Sovereign Activation Certificate (issued after admin activates account) ──
    # Elevated trust scope: clientAuth + emailProtection + codeSigning EKU
    # 1-year validity — annual renewal cycle
    activation_cert_id          = models.UUIDField(null=True, blank=True, unique=True, default=None, help_text="Sovereign activation certificate identifier")
    activation_cert_issued_at   = models.DateTimeField(null=True, blank=True)
    activation_cert_expires_at  = models.DateTimeField(null=True, blank=True)
    activation_cert_url         = models.URLField(max_length=500, blank=True, null=True, help_text="URL to the sovereign activation certificate PDF")
    activation_cert_serial      = models.CharField(max_length=128, blank=True, null=True, help_text="Activation cert X.509 serial number (hex)")
    activation_cert_fingerprint = models.CharField(max_length=256, blank=True, null=True, help_text="SHA-256 fingerprint of the activation certificate")


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

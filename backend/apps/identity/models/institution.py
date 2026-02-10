from django.db import models
from apps.identity.models.core_models import User

class Institution(models.Model):
    """
    Represents an educational institution (College/University) on the platform.
    Supports multi-tenancy.
    """
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    domain = models.CharField(max_length=255, unique=True, help_text="Institution email domain (e.g., mit.edu)")
    address = models.TextField(blank=True)
    contact_email = models.EmailField()
    logo_url = models.URLField(blank=True, null=True)
    
    # Subscription/Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class InstitutionAdmin(models.Model):
    """
    Profile for institution-level administrators.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="institution_admin_profile")
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="admins")
    role_description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.user.email} - {self.institution.name} Admin"

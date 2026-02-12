from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField

class AcademicRegistry(models.Model):
    """
    Read-Only Source of Truth for Student Academic History.
    Populated via Excel/CSV Bulk Import.
    """
    roll_number = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    program = models.CharField(max_length=100) # B.Tech, MBA
    branch = models.CharField(max_length=100) # CSE, ECE
    batch_year = models.IntegerField()
    current_semester = models.IntegerField(default=1)
    
    # Sensitive Data
    personal_email = models.EmailField(null=True, blank=True)
    official_email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    
    # Academic History (JSON for flexibility)
    history_data = models.JSONField(default=dict) 
    # Structure: {'sem1': {'sgpa': 9.0, 'backlogs': 0}, '10th': {'percentage': 95}}

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.roll_number} - {self.full_name}"

class PreSeededRegistry(models.Model):
    """
    Registry of allowed users (Student/Faculty) before they activate their account.
    Used for validation during onboarding.
    """
    ROLE_CHOICES = (
        ('STUDENT', 'Student'),
        ('FACULTY', 'Faculty'),
        ('ADMIN', 'Institutional Admin'),
    )
    
    identifier = models.CharField(max_length=255, unique=True, db_index=True) 
    # For students: Roll Number. For Faculty: Employee ID or Email.
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    email = models.EmailField() # Verification channel
    
    is_active = models.BooleanField(default=False) # True once account is claimed
    activated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.identifier} ({self.role})"

class AuthorizedAccount(models.Model):
    """
    Schema-isolated authentication record for Students, Faculty, and Admins.
    Stores hashed credentials and MFA secrets within the tenant schema.
    """
    registry_ref = models.OneToOneField(PreSeededRegistry, on_delete=models.CASCADE)
    
    # Credentials (V2 Isolation)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    mfa_secret = models.CharField(max_length=255, blank=True, null=True)
    
    role = models.CharField(max_length=20, choices=PreSeededRegistry.ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_ua = models.TextField(null=True, blank=True)
    
    # Role specific data linkage
    student_profile = models.OneToOneField(AcademicRegistry, on_delete=models.SET_NULL, null=True, blank=True)
    
    # V2 Timestamps (Allowing null for migration on existing tables)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    def __str__(self):
        return f"{self.email} ({self.role})"

class FacultyProfile(models.Model):
    """
    Tenant-specific profile for Faculty/Admins.
    """
    auth_account = models.OneToOneField(AuthorizedAccount, on_delete=models.CASCADE)
    designation = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    joining_date = models.DateField(null=True, blank=True)
    
    courses_handling = ArrayField(models.CharField(max_length=100), default=list, blank=True)

    def __str__(self):
        return f"Prof. {self.auth_account.email} ({self.department})"

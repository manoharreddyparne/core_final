from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField

# ==============================================================================
# 🎓 1. STUDENT CONTEXT (Registry + Account + Academic)
# ==============================================================================

class StudentAcademicRegistry(models.Model):
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
    
    personal_email = models.EmailField(null=True, blank=True)
    official_email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    
    # NEW: Detailed Academic & Personal Fields
    date_of_birth = models.DateField(null=True, blank=True)
    admission_year = models.IntegerField(null=True, blank=True)
    passout_year = models.IntegerField(null=True, blank=True)
    section = models.CharField(max_length=10, blank=True)
    
    # Performance
    current_semester = models.IntegerField(default=1)
    sgpa_history = models.JSONField(default=dict, help_text="Semester-wise GPA mapping")
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    history_data = models.JSONField(default=dict) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Student Academic Registries"

    def __str__(self):
        return f"{self.roll_number} - {self.full_name}"

class StudentPreSeededRegistry(models.Model):
    """
    Registry of allowed Students before they activate their account.
    Usually mapped from roll_number.
    """
    identifier = models.CharField(max_length=255, unique=True, db_index=True) # Roll Number
    email = models.EmailField()
    is_activated = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    
    # Invitation Tracking
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pre-Student: {self.identifier}"

class StudentAuthorizedAccount(models.Model):
    """
    Activated Student credentials.
    Isolated from Admin/Faculty tables.
    """
    registry_ref = models.OneToOneField(StudentPreSeededRegistry, on_delete=models.CASCADE)
    academic_ref = models.OneToOneField(StudentAcademicRegistry, on_delete=models.SET_NULL, null=True, blank=True)
    
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    mfa_secret = models.CharField(max_length=255, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_ua = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return False

    @property
    def pk(self):
        return self.id

    def get_username(self):
        return self.email

    def __str__(self):
        return f"Student: {self.email}"

    @property
    def role(self):
        return "STUDENT"


# ==============================================================================
# 👨‍🏫 2. FACULTY CONTEXT (Registry + Account)
# ==============================================================================

class FacultyPreSeededRegistry(models.Model):
    """
    Whitelist for Educators/SPOCs.
    """
    identifier = models.CharField(max_length=255, unique=True, db_index=True) # Employee ID or Email
    email = models.EmailField()
    is_activated = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    
    # Invitation Tracking
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pre-Faculty: {self.identifier}"

class FacultyAcademicRegistry(models.Model):
    """
    Independent Professional/Academic details for Faculty.
    """
    employee_id = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    
    designation = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    joining_date = models.DateField(null=True, blank=True)
    courses_handling = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"

class FacultyAuthorizedAccount(models.Model):
    """
    Activated Faculty credentials.
    """
    registry_ref = models.OneToOneField(FacultyPreSeededRegistry, on_delete=models.CASCADE)
    academic_ref = models.OneToOneField(FacultyAcademicRegistry, on_delete=models.SET_NULL, null=True, blank=True)
    
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    mfa_secret = models.CharField(max_length=255, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_ua = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return False

    @property
    def pk(self):
        return self.id

    def get_username(self):
        return self.email

    def __str__(self):
        return f"Faculty: {self.email}"

    @property
    def role(self):
        return "FACULTY"


# ==============================================================================
# 🛡️ 3. ADMIN CONTEXT (Registry + Account)
# ==============================================================================

class AdminPreSeededRegistry(models.Model):
    """
    Whitelist for Institutional Admins.
    """
    identifier = models.CharField(max_length=255, unique=True, db_index=True) # Email
    is_activated = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pre-Admin: {self.identifier}"

class AdminAuthorizedAccount(models.Model):
    """
    Activated Institutional Admin credentials.
    Only valid for portal administration.
    """
    registry_ref = models.OneToOneField(AdminPreSeededRegistry, on_delete=models.CASCADE)
    
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.CharField(max_length=255)
    mfa_secret = models.CharField(max_length=255, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_ua = models.TextField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_staff(self):
        return False

    @property
    def pk(self):
        return self.id

    def get_username(self):
        return self.email

    def __str__(self):
        return f"InstAdmin: {self.email}"

    @property
    def role(self):
        return "INSTITUTION_ADMIN"

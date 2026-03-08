from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from apps.academic.models import Department, AcademicProgram, ClassSection, Semester

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
    
    # Legacy String Fields (Raw Feed)
    program = models.CharField(max_length=100) # B.Tech, MBA
    branch = models.CharField(max_length=100) # CSE, ECE
    section = models.CharField(max_length=10, blank=True)
    current_semester = models.IntegerField(default=1)

    # 🧬 Smart Governance Links (Normalized)
    program_ref = models.ForeignKey('academic.AcademicProgram', on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_students')
    department_ref = models.ForeignKey('academic.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_students')
    section_ref = models.ForeignKey('academic.ClassSection', on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_students')
    semester_ref = models.ForeignKey('academic.Semester', on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_students')
    
    batch_year = models.IntegerField()
    
    personal_email = models.EmailField(null=True, blank=True)
    official_email = models.EmailField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    
    # NEW: Detailed Academic & Personal Fields
    date_of_birth = models.DateField(null=True, blank=True)
    admission_year = models.IntegerField(null=True, blank=True)
    passout_year = models.IntegerField(null=True, blank=True)
    
    # Performance
    current_semester = models.IntegerField(default=1)
    sgpa_history = models.JSONField(default=dict, help_text="Semester-wise GPA mapping")
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    history_data = models.JSONField(default=dict) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Student Academic Registries"

    def sync_to_preseeded(self):
        """
        Synchronizes this academic record with the PreSeeded Identity Registry (Table 2).
        Ensures that an invitation can always be sent if the identity exists.
        """
        email_to_use = self.official_email or self.personal_email
        if not email_to_use:
            return # Cannot sync without email
            
        StudentPreSeededRegistry.objects.update_or_create(
            identifier=self.roll_number,
            defaults={
                "email": email_to_use,
            }
        )

    def sync_to_academic(self):
        """
        🧬 Lifecycle Automation: 
        Auto-enrolls student in all subjects for their program/semester/section.
        """
        from apps.academic.models import Subject, StudentEnrollment
        
        if not self.program_ref or not self.semester_ref:
            return

        # Find all subjects for this program and semester
        subjects = Subject.objects.filter(
            program=self.program_ref,
            semester_number=self.semester_ref.semester_number,
            is_active=True
        )

        for subj in subjects:
            StudentEnrollment.objects.update_or_create(
                roll_number=self.roll_number,
                subject=subj,
                semester=self.semester_ref,
                defaults={
                    "student_name": self.full_name,
                    "section": self.section_ref,
                    "status": "ACTIVE"
                }
            )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        # 🛡️ Auto-Sync to Identity Registry
        self.sync_to_preseeded()
        # 🧪 Auto-Sync to Academic Infrastructure (Enrollments)
        self.sync_to_academic()

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
    
    # Invitation & Activation Security
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_count = models.IntegerField(default=0)
    activation_token = models.CharField(max_length=512, unique=True, null=True, blank=True, db_index=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    
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
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
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

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    def __str__(self):
        return f"Student: {self.email}"

    @property
    def role(self):
        return "STUDENT"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


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
    
    # Invitation & Activation Security
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_count = models.IntegerField(default=0)
    activation_token = models.CharField(max_length=512, unique=True, null=True, blank=True, db_index=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    
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
    email = models.EmailField(unique=True) # Primary Contact/Login
    
    personal_email = models.EmailField(null=True, blank=True)
    official_email = models.EmailField(null=True, blank=True)
    
    designation = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    joining_date = models.DateField(null=True, blank=True)
    courses_handling = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    
    # 🧬 Smart Governance Link
    department_ref = models.ForeignKey('academic.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_faculty')
    
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
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
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

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    def __str__(self):
        return f"Faculty: {self.email}"

    @property
    def role(self):
        return "FACULTY"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email


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
    
    # Invitation & Activation Security
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    invitation_count = models.IntegerField(default=0)
    activation_token = models.CharField(max_length=512, unique=True, null=True, blank=True, db_index=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)

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
    first_name = models.CharField(max_length=150, blank=True, default='')
    last_name = models.CharField(max_length=150, blank=True, default='')
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

    def set_password(self, raw_password):
        from django.contrib.auth.hashers import make_password
        self.password_hash = make_password(raw_password)

    def check_password(self, raw_password):
        from django.contrib.auth.hashers import check_password
        return check_password(raw_password, self.password_hash)

    def __str__(self):
        return f"InstAdmin: {self.email}"

    @property
    def role(self):
        return "INST_ADMIN"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

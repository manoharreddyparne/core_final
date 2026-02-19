import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import URLValidator
from django.db import models
from django.utils import timezone
from apps.identity.utils.security import hash_token  # centralized HMAC hashing

# --------------------------
# Custom User Model
# --------------------------
class User(AbstractUser):
    class Roles(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        INSTITUTION_ADMIN = "INST_ADMIN", "Institution Admin"
        ADMIN = "ADMIN", "Admin"
        TEACHER = "TEACHER", "Teacher"
        STUDENT = "STUDENT", "Student"

    email = models.EmailField(unique=True, verbose_name="Email Address")
    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.STUDENT,
        verbose_name="User Role",
    )
    avatar_filename = models.CharField(
        max_length=255, default="default_avatar_1.png", verbose_name="Local avatar filename"
    )
    avatar_url = models.CharField(
        max_length=512, blank=True, validators=[URLValidator()], verbose_name="Remote avatar URL"
    )

    # Security flags
    need_password_reset = models.BooleanField(default=False)
    first_time_login = models.BooleanField(default=True)
    failed_login_attempts = models.IntegerField(default=0)
    lockout_until = models.DateTimeField(null=True, blank=True)

    # Multi-tenant link for Students
    stu_ref = models.OneToOneField(
        'identity.CoreStudent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='auth_user',
        verbose_name="Core Student Reference"
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.username or self.email} ({self.role})"


# --------------------------
# Subject Model
# --------------------------
class Subject(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


# --------------------------
# Teacher Profile
# --------------------------
class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")
    institution = models.ForeignKey(
        'identity.Institution', 
        on_delete=models.CASCADE, 
        related_name="teacher_profiles",
        null=True, blank=True
    )
    department = models.CharField(max_length=100, blank=True)
    subjects = models.ManyToManyField(Subject, blank=True, related_name="teachers")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["user__email"]
        indexes = [models.Index(fields=["department"])]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} - Teacher"


# --------------------------
# Core Student Model
# --------------------------
class CoreStudent(models.Model):
    """
    Institution-seeded student academic data.
    Authoritative student data managed by the institution.
    """
    class IdentityState(models.TextChoices):
        SEEDED = "SEEDED", "Seeded"
        INVITED = "INVITED", "Invited"
        VERIFIED = "VERIFIED", "Verified"
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"

    # Core Identity (Provided by Institution)
    stu_ref = models.CharField(
        max_length=50, 
        primary_key=True, 
        help_text="Unique student reference (e.g., 2021-CS-001)", 
        verbose_name="Student Reference"
    )
    
    DEPARTMENT_CHOICES = [
        ('CSE', 'Computer Science and Engineering'),
        ('IT', 'Information Technology'),
        ('ECE', 'Electronics and Communication Engineering'),
        ('EEE', 'Electrical and Electronics Engineering'),
        ('MECH', 'Mechanical Engineering'),
        ('CIVIL', 'Civil Engineering'),
        ('OTHER', 'Other'),
    ]
    roll_number = models.CharField(max_length=50, db_index=True, unique=True)
    full_name = models.CharField(max_length=255, verbose_name="Full Name")
    official_email = models.EmailField(unique=True, db_index=True, verbose_name="Official Email")
    
    # Institution Link
    institution = models.ForeignKey(
        'identity.Institution', 
        on_delete=models.CASCADE, 
        related_name='core_students',
        null=True, 
        blank=True
    )
    
    # Academic Details
    department = models.CharField(max_length=100, blank=True)
    batch_year = models.IntegerField(null=True, blank=True)
    current_semester = models.IntegerField(null=True, blank=True)
    
    # Performance Metrics (Secure Database)
    cgpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    tenth_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    twelfth_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # State Machine
    status = models.CharField(
        max_length=20, 
        choices=IdentityState.choices, 
        default=IdentityState.SEEDED,
        db_index=True
    )
    is_activated = models.BooleanField(default=False)
    
    # Metadata
    seeded_at = models.DateTimeField(auto_now_add=True)
    seeded_by = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Placement Eligibility
    is_eligible_for_placement = models.BooleanField(default=False)
    placement_eligibility_reason = models.TextField(blank=True)

    @property
    def academic_summary(self):
        return f"{self.department or ''} - Batch {self.batch_year or ''}"

    @property
    def is_invited(self):
        return self.status == self.IdentityState.INVITED

    @property
    def is_active(self):
        return self.status == self.IdentityState.ACTIVE

    def __str__(self):
        return f"{self.full_name} ({self.stu_ref})"

    class Meta:
        ordering = ["stu_ref"]
        db_table = 'core_students'
        verbose_name = 'Core Student'
        verbose_name_plural = 'Core Students'
        indexes = [
            models.Index(fields=["roll_number"]),
            models.Index(fields=["status"]),
            models.Index(fields=["institution"]),
        ]


# --------------------------
# Student Profile
# --------------------------
class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    institution = models.ForeignKey(
        'identity.Institution', 
        on_delete=models.CASCADE, 
        related_name="student_profiles",
        null=True, blank=True
    )
    roll_number = models.CharField(max_length=50, unique=True)
    admission_year = models.CharField(max_length=10, blank=True)
    batch = models.CharField(max_length=50, blank=True)
    branch = models.CharField(max_length=100, blank=True)
    enrolled_subjects = models.ManyToManyField(Subject, blank=True, related_name="students")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["roll_number"]
        indexes = [models.Index(fields=["roll_number"]), models.Index(fields=["batch"])]

    def __str__(self):
        return f"{self.roll_number} - {self.user.get_full_name() or self.user.email}"


# --------------------------
# Password Reset Request
# --------------------------
class PasswordResetRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_requests")
    token_hash = models.CharField(max_length=128, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    requested_ip = models.GenericIPAddressField(blank=True, null=True)
    requested_user_agent = models.CharField(max_length=512, blank=True)
    requested_device = models.CharField(max_length=255, blank=True)

    EXPIRY_HOURS = 24

    def save(self, *args, **kwargs):
        if not self.token_hash:
            raw_token = secrets.token_urlsafe(64)
            self.token_hash = hash_token(raw_token)
            self._raw_token = raw_token
        super().save(*args, **kwargs)

    @property
    def raw_token(self):
        return getattr(self, "_raw_token", None)

    def is_expired(self) -> bool:
        now = timezone.now()
        if self.used:
            return True
        if now > self.created_at + timedelta(hours=self.EXPIRY_HOURS):
            return True
        if PasswordResetRequest.objects.filter(
            user=self.user, created_at__gt=self.created_at, used=False
        ).exists():
            return True
        return False

    @classmethod
    def create_reset_request(cls, user: User):
        raw_token = secrets.token_urlsafe(64)
        token_hash = hash_token(raw_token)
        reset_request = cls.objects.create(user=user, token_hash=token_hash, used=False)
        reset_request._raw_token = raw_token
        return reset_request, raw_token

    def mark_used(self):
        self.used = True
        self.save(update_fields=["used"])

    def __str__(self):
        return f"PasswordResetRequest for {self.user.email} at {self.created_at}"

    class Meta:
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "created_at"]),
        ]


# --------------------------
# Password History
# --------------------------
class PasswordHistory(models.Model):
    MAX_HISTORY = 5

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_history")
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("user", "password_hash")]
        indexes = [models.Index(fields=["user", "created_at"])]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        histories = PasswordHistory.objects.filter(user=self.user).order_by("-created_at")
        if histories.count() > self.MAX_HISTORY:
            for old in histories[self.MAX_HISTORY:]:
                old.delete()

    def __str__(self):
        return f"Old password for {self.user.email} at {self.created_at}"

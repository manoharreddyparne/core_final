"""
Core Student Model - Institution-Seeded Student Data

This model represents the authoritative student data managed by the institution.
Students CANNOT modify this data - it's read-only for them.
This is separate from the authentication system (User model).
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError


class CoreStudent(models.Model):
    """
    Institution-seeded student academic data.
    
    This is the "source of truth" for student information.
    Populated by admin/SPOC via bulk upload before students activate accounts.
    """
    
    STATUS_CHOICES = [
        ('SEEDED', 'Seeded'),     # Added to database, no invite sent
        ('INVITED', 'Invited'),   # Activation email sent
        ('ACTIVE', 'Active'),     # Account activated by student
        ('SUSPENDED', 'Suspended'), # Account suspended
    ]
    
    DEPARTMENT_CHOICES = [
        ('CSE', 'Computer Science and Engineering'),
        ('IT', 'Information Technology'),
        ('ECE', 'Electronics and Communication Engineering'),
        ('EEE', 'Electrical and Electronics Engineering'),
        ('MECH', 'Mechanical Engineering'),
        ('CIVIL', 'Civil Engineering'),
        ('OTHER', 'Other'),
    ]
    
    # ========================================
    # Primary Identity (Institution-Controlled)
    # ========================================
    stu_ref = models.CharField(
        max_length=20,
        primary_key=True,
        help_text="Unique student reference (e.g., 2021-CS-001)",
        verbose_name="Student Reference"
    )
    
    roll_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name="Roll Number"
    )
    
    full_name = models.CharField(
        max_length=255,
        verbose_name="Full Name"
    )
    
    # ========================================
    # Academic Details
    # ========================================
    department = models.CharField(
        max_length=100,
        choices=DEPARTMENT_CHOICES,
        verbose_name="Department"
    )
    
    batch_year = models.IntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        help_text="Year of admission",
        verbose_name="Batch Year"
    )
    
    current_semester = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(8)],
        help_text="Current semester (1-8)",
        verbose_name="Current Semester"
    )
    
    # ========================================
    # Performance Metrics
    # ========================================
    cgpa = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(10.0)],
        null=True,
        blank=True,
        help_text="Current CGPA (0.00 - 10.00)",
        verbose_name="CGPA"
    )
    
    tenth_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="10th grade percentage",
        verbose_name="10th %"
    )
    
    twelfth_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        help_text="12th grade percentage",
        verbose_name="12th %"
    )
    
    attendance_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0.0), MaxValueValidator(100.0)],
        null=True,
        blank=True,
        help_text="Overall attendance percentage",
        verbose_name="Attendance %"
    )
    
    # ========================================
    # Contact Information
    # ========================================
    official_email = models.EmailField(
        unique=True,
        db_index=True,
        help_text="Official institutional email",
        verbose_name="Official Email"
    )
    
    # ========================================
    # Status & Metadata
    # ========================================
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='SEEDED',
        db_index=True,
        verbose_name="Status"
    )
    
    seeded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Seeded At"
    )
    
    seeded_by = models.CharField(
        max_length=255,
        help_text="Admin/SPOC who added this student",
        verbose_name="Seeded By"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Last Updated"
    )
    
    # ========================================
    # Placement Eligibility
    # ========================================
    is_eligible_for_placement = models.BooleanField(
        default=False,
        help_text="Eligible for placement drives",
        verbose_name="Placement Eligible"
    )
    
    placement_eligibility_reason = models.TextField(
        blank=True,
        help_text="Reason if not eligible",
        verbose_name="Eligibility Reason"
    )
    
    class Meta:
        db_table = 'core_students'
        ordering = ['stu_ref']
        verbose_name = 'Core Student'
        verbose_name_plural = 'Core Students'
        
        indexes = [
            models.Index(fields=['status'], name='idx_core_student_status'),
            models.Index(fields=['batch_year'], name='idx_core_student_batch'),
            models.Index(fields=['department'], name='idx_core_student_dept'),
            models.Index(fields=['is_eligible_for_placement'], name='idx_core_student_eligible'),
        ]
    
    def __str__(self):
        return f"{self.stu_ref} - {self.full_name}"
    
    def clean(self):
        """Validate model data"""
        super().clean()
        
        # Validate STU_REF format (example: 2021-CS-001)
        if self.stu_ref:
            parts = self.stu_ref.split('-')
            if len(parts) != 3:
                raise ValidationError({
                    'stu_ref': 'STU_REF must be in format: YEAR-DEPT-NUMBER (e.g., 2021-CS-001)'
                })
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.full_clean()
        super().save(*args, **kwargs)
    
    @property
    def academic_summary(self):
        """Get formatted academic summary"""
        return {
            'cgpa': float(self.cgpa) if self.cgpa else None,
            'tenth': float(self.tenth_percentage),
            'twelfth': float(self.twelfth_percentage),
            'attendance': float(self.attendance_percentage) if self.attendance_percentage else None,
        }
    
    @property
    def is_invited(self):
        """Check if student has been invited"""
        return self.status in ['INVITED', 'ACTIVE']
    
    @property
    def is_active(self):
        """Check if student has activated account"""
        return self.status == 'ACTIVE'

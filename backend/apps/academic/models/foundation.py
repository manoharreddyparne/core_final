# apps/academic/models/foundation.py
# Root-level academic hierarchy: Department → Program → Year → Semester
# ─────────────────────────────────────────────────────────────────────────────
from django.db import models


class Department(models.Model):
    """
    Academic department (CSE, ECE, MECH, MBA, etc.).
    Root node of the academic hierarchy.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)   # CSE, ECE
    description = models.TextField(blank=True)
    head_email = models.EmailField(blank=True, null=True)  # HOD email
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return f"{self.code} — {self.name}"


class AcademicProgram(models.Model):
    """
    Degree programs: B.Tech, M.Tech, MBA, MCA, BCA etc.
    """
    DURATION_CHOICES = [
        (2, '2 Years'),
        (3, '3 Years'),
        (4, '4 Years'),
        (5, '5 Years'),
    ]

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='programs'
    )
    name = models.CharField(max_length=255)           # B.Tech Computer Science
    code = models.CharField(max_length=30, unique=True)  # BTECH-CSE
    degree_type = models.CharField(max_length=50, default='B.Tech')
    duration_years = models.PositiveSmallIntegerField(choices=DURATION_CHOICES, default=4)
    total_semesters = models.PositiveSmallIntegerField(default=8)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['department__code', 'name']
        verbose_name = "Academic Program"
        verbose_name_plural = "Academic Programs"

    def __str__(self):
        return f"{self.code}"


class AcademicYear(models.Model):
    """
    Academic year: 2024-25, 2025-26.
    Controls all scheduling contexts.
    """
    label = models.CharField(max_length=20, unique=True)   # e.g. "2024-25"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name = "Academic Year"
        verbose_name_plural = "Academic Years"

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.label


class Semester(models.Model):
    """
    A specific semester within an academic year for a program.
    e.g. Semester 5 of BTECH-CSE in 2024-25
    """
    STATUS_CHOICES = [
        ('UPCOMING', 'Upcoming'),
        ('ONGOING', 'Ongoing'),
        ('COMPLETED', 'Completed'),
    ]

    program = models.ForeignKey(AcademicProgram, on_delete=models.CASCADE, related_name='semesters')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='semesters')
    semester_number = models.PositiveSmallIntegerField()   # 1–8
    label = models.CharField(max_length=50, blank=True)    # "Odd 2024", "Even 2025"
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPCOMING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['program__code', 'semester_number']
        unique_together = ('program', 'academic_year', 'semester_number')
        verbose_name = "Semester"
        verbose_name_plural = "Semesters"

    def __str__(self):
        return f"{self.program.code} — Sem {self.semester_number} ({self.academic_year.label})"

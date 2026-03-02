# apps/academic/models/curriculum.py
# Subject (replaces legacy Course) + SyllabusUnit + Legacy models
# ─────────────────────────────────────────────────────────────────────────────
from django.db import models
from django.contrib.postgres.fields import ArrayField

from .foundation import Department, AcademicProgram


class Subject(models.Model):
    """
    A subject taught in a specific semester of a program.
    Replaces/extends the old generic 'Course' model.
    """
    TYPE_CHOICES = [
        ('THEORY', 'Theory'),
        ('LAB', 'Lab / Practical'),
        ('PROJECT', 'Project'),
        ('ELECTIVE', 'Elective'),
        ('AUDIT', 'Audit Course'),
    ]

    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='subjects')
    program = models.ForeignKey(AcademicProgram, on_delete=models.CASCADE, related_name='subjects')
    semester_number = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=30, unique=True)    # CS501
    subject_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='THEORY')
    credits = models.PositiveSmallIntegerField(default=3)
    max_marks = models.PositiveIntegerField(default=100)
    passing_marks = models.PositiveIntegerField(default=40)
    is_placement_relevant = models.BooleanField(
        default=False,
        help_text="Flag subjects that are relevant to placement preparation"
    )
    placement_tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="e.g. ['DSA', 'DBMS', 'OS'] — used by exam engine for auto-question tagging"
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"

    def __str__(self):
        return f"{self.code} — {self.name}"


class SyllabusUnit(models.Model):
    """
    Topic/Unit inside a Subject syllabus.
    Used by GenAI exam engine to auto-generate questions per unit.
    """
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='syllabus_units')
    unit_number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=255)
    topics = ArrayField(
        models.CharField(max_length=200),
        default=list,
        help_text="List of topics covered in this unit"
    )
    hours_required = models.PositiveSmallIntegerField(default=6)
    ai_question_weight = models.FloatField(
        default=1.0,
        help_text="Weight for AI question generation (higher = more questions from this unit)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['subject__code', 'unit_number']
        unique_together = ('subject', 'unit_number')
        verbose_name = "Syllabus Unit"
        verbose_name_plural = "Syllabus Units"

    def __str__(self):
        return f"{self.subject.code} — Unit {self.unit_number}: {self.title}"


# ──────────────────────────────────────────────
# Legacy models — kept for backward compat with apps.quizzes
# ──────────────────────────────────────────────
class Course(models.Model):
    """
    Legacy model kept for backward compatibility with apps.quizzes.
    Use Subject for new academic management.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='legacy_courses')
    program = models.ForeignKey(AcademicProgram, on_delete=models.SET_NULL, null=True, blank=True, related_name='legacy_courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code', 'name']
        verbose_name = "Course (Legacy)"
        verbose_name_plural = "Courses (Legacy)"

    def __str__(self):
        return f"{self.name} ({self.code})"


class Batch(models.Model):
    """
    Legacy model kept for backward compatibility with apps.quizzes.
    Use ClassSection + Semester for new academic management.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="batches")
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    roll_numbers = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text="List of student roll numbers enrolled in this batch"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['course__code', 'name']
        verbose_name = "Batch (Legacy)"
        verbose_name_plural = "Batches (Legacy)"

    def __str__(self):
        return f"{self.course.code} - {self.name}"

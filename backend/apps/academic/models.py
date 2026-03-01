# apps/academic/models.py
# Full Academic Infrastructure for AUIP Platform
# Per-tenant schema (in TENANT_APPS)
# ─────────────────────────────────────────────────────────────────────────────
from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import ArrayField


# ──────────────────────────────────────────────
# 1. DEPARTMENT
# ──────────────────────────────────────────────
class Department(models.Model):
    """
    Academic department (CSE, ECE, MECH, MBA, etc.).
    Root node of the academic hierarchy.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, unique=True)   # CSE, ECE
    description = models.TextField(blank=True)
    head_email = models.EmailField(blank=True, null=True)  # HOD email (linked to FacultyAcademicRegistry)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        verbose_name = "Department"
        verbose_name_plural = "Departments"

    def __str__(self):
        return f"{self.code} — {self.name}"


# ──────────────────────────────────────────────
# 2. ACADEMIC PROGRAM
# ──────────────────────────────────────────────
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
    degree_type = models.CharField(max_length=50, default='B.Tech')  # B.Tech, M.Tech, MBA
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


# ──────────────────────────────────────────────
# 3. ACADEMIC YEAR
# ──────────────────────────────────────────────
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
        # Only one academic year can be current
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.label


# ──────────────────────────────────────────────
# 4. SEMESTER
# ──────────────────────────────────────────────
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

    program = models.ForeignKey(
        AcademicProgram,
        on_delete=models.CASCADE,
        related_name='semesters'
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='semesters'
    )
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


# ──────────────────────────────────────────────
# 5. SUBJECT (Course/Subject in Semester)
# ──────────────────────────────────────────────
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
    semester_number = models.PositiveSmallIntegerField()   # Which sem this runs in
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


# ──────────────────────────────────────────────
# 6. SYLLABUS UNIT (Topic-level breakdown)
# ──────────────────────────────────────────────
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
# 7. CLASS SECTION
# ──────────────────────────────────────────────
class ClassSection(models.Model):
    """
    Sections within a batch: Section A, Section B.
    Students are assigned to sections.
    """
    program = models.ForeignKey(AcademicProgram, on_delete=models.CASCADE, related_name='sections')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='sections')
    semester_number = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=10)   # A, B, C
    max_strength = models.PositiveIntegerField(default=60)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['program__code', 'semester_number', 'name']
        unique_together = ('program', 'academic_year', 'semester_number', 'name')
        verbose_name = "Class Section"
        verbose_name_plural = "Class Sections"

    def __str__(self):
        return f"{self.program.code} Sem{self.semester_number} Sec-{self.name} ({self.academic_year})"


# ──────────────────────────────────────────────
# 8. TEACHER ASSIGNMENT
# ──────────────────────────────────────────────
class TeacherAssignment(models.Model):
    """
    Which faculty member teaches which subject in which section/semester.
    Links FacultyAcademicRegistry.employee_id to a Subject + Section.
    """
    employee_id = models.CharField(
        max_length=50,
        help_text="Links to FacultyAcademicRegistry.employee_id"
    )
    faculty_name = models.CharField(max_length=255)   # Denormalized for display
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='teacher_assignments')
    section = models.ForeignKey(
        ClassSection,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        null=True, blank=True
    )
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='teacher_assignments')
    semester = models.ForeignKey(Semester, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    is_primary = models.BooleanField(default=True)   # Primary vs co-teacher
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-academic_year__start_date', 'subject__code']
        verbose_name = "Teacher Assignment"
        verbose_name_plural = "Teacher Assignments"

    def __str__(self):
        return f"{self.employee_id} → {self.subject.code} ({self.academic_year})"


# ──────────────────────────────────────────────
# 9. STUDENT ENROLLMENT
# ──────────────────────────────────────────────
class StudentEnrollment(models.Model):
    """
    Formal enrollment of a student in a Subject for a semester.
    Links StudentAcademicRegistry.roll_number to Subject + Section.
    This drives exam eligibility, attendance, and grades.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('DROPPED', 'Dropped'),
        ('COMPLETED', 'Completed'),
        ('DETAINED', 'Detained (< 75% attendance)'),
    ]

    roll_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Links to StudentAcademicRegistry.roll_number"
    )
    student_name = models.CharField(max_length=255)   # Denormalized for fast display
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='enrollments')
    section = models.ForeignKey(
        ClassSection,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='enrollments'
    )
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['semester__semester_number', 'subject__code', 'roll_number']
        unique_together = ('roll_number', 'subject', 'semester')
        verbose_name = "Student Enrollment"
        verbose_name_plural = "Student Enrollments"

    def __str__(self):
        return f"{self.roll_number} enrolled in {self.subject.code} ({self.semester})"


# ──────────────────────────────────────────────
# 10. ATTENDANCE
# ──────────────────────────────────────────────
class AttendanceSession(models.Model):
    """
    A single class session for attendance tracking.
    Faculty marks attendance per session.
    """
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='attendance_sessions')
    section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendance_sessions')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='attendance_sessions')
    employee_id = models.CharField(max_length=50)    # Who took attendance
    session_date = models.DateField()
    session_type = models.CharField(
        max_length=20,
        choices=[('LECTURE', 'Lecture'), ('LAB', 'Lab'), ('TUTORIAL', 'Tutorial')],
        default='LECTURE'
    )
    topic_covered = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-session_date', 'subject__code']
        verbose_name = "Attendance Session"
        verbose_name_plural = "Attendance Sessions"

    def __str__(self):
        return f"{self.subject.code} — {self.session_date}"


class AttendanceRecord(models.Model):
    """
    Individual student attendance for a session.
    """
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('EXCUSED', 'Excused'),
        ('OD', 'On Duty'),
    ]

    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    roll_number = models.CharField(max_length=50, db_index=True)
    student_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABSENT')
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['session__session_date', 'roll_number']
        unique_together = ('session', 'roll_number')
        verbose_name = "Attendance Record"
        verbose_name_plural = "Attendance Records"

    def __str__(self):
        return f"{self.roll_number} — {self.session.subject.code} — {self.status}"


# ──────────────────────────────────────────────
# 11. INTERNAL MARKS / GRADES
# ──────────────────────────────────────────────
class InternalMark(models.Model):
    """
    Stores internal assessment marks (CIA1, CIA2, Mid-Term, Assignment).
    Source of truth for grade computation.
    """
    ASSESSMENT_CHOICES = [
        ('CIA1', 'CIA 1'),
        ('CIA2', 'CIA 2'),
        ('MID', 'Mid-Term'),
        ('ASSIGNMENT', 'Assignment'),
        ('LAB', 'Lab Record'),
        ('VIVA', 'Viva'),
        ('PROJECT', 'Project'),
        ('FINAL', 'Final Exam (External)'),
    ]

    roll_number = models.CharField(max_length=50, db_index=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='internal_marks')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='internal_marks')
    assessment_type = models.CharField(max_length=20, choices=ASSESSMENT_CHOICES)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_marks = models.PositiveIntegerField(default=25)
    remarks = models.TextField(blank=True)
    entered_by = models.CharField(max_length=50, blank=True)   # employee_id
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-semester__semester_number', 'subject__code', 'roll_number']
        unique_together = ('roll_number', 'subject', 'semester', 'assessment_type')
        verbose_name = "Internal Mark"
        verbose_name_plural = "Internal Marks"

    @property
    def percentage(self):
        return round((float(self.marks_obtained) / self.max_marks) * 100, 2) if self.max_marks else 0

    def __str__(self):
        return f"{self.roll_number} — {self.subject.code} — {self.assessment_type}: {self.marks_obtained}/{self.max_marks}"


# ──────────────────────────────────────────────
# 12. LEGACY (keep for backward compat with quizzes app)
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
    # FIXED: Use roll_number list instead of FK to identity.User (cross-schema issue)
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

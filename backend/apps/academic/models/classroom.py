from django.db import models
from .foundation import AcademicProgram, AcademicYear, Semester
from .curriculum import Subject

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

class TeacherAssignment(models.Model):
    """
    Which faculty member teaches which subject in which section/semester.
    """
    employee_id = models.CharField(max_length=50)
    faculty_name = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='teacher_assignments')
    section = models.ForeignKey(ClassSection, on_delete=models.CASCADE, related_name='teacher_assignments', null=True, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='teacher_assignments')
    semester = models.ForeignKey(Semester, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    is_primary = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-academic_year__start_date', 'subject__code']
        verbose_name = "Teacher Assignment"
        verbose_name_plural = "Teacher Assignments"

    def __str__(self):
        return f"{self.employee_id} → {self.subject.code} ({self.academic_year})"

class StudentEnrollment(models.Model):
    """
    Formal enrollment of a student in a Subject for a semester.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'), ('DROPPED', 'Dropped'),
        ('COMPLETED', 'Completed'), ('DETAINED', 'Detained (< 75% attendance)'),
    ]
    roll_number = models.CharField(max_length=50, db_index=True)
    student_name = models.CharField(max_length=255)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='enrollments')
    section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments')
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

class AttendanceSession(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='attendance_sessions')
    section = models.ForeignKey(ClassSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendance_sessions')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='attendance_sessions')
    employee_id = models.CharField(max_length=50)
    session_date = models.DateField()
    session_type = models.CharField(max_length=20, choices=[('LECTURE', 'Lecture'), ('LAB', 'Lab'), ('TUTORIAL', 'Tutorial')], default='LECTURE')
    topic_covered = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-session_date', 'subject__code']

class AttendanceRecord(models.Model):
    STATUS_CHOICES = [('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('LATE', 'Late'), ('EXCUSED', 'Excused'), ('OD', 'On Duty')]
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    roll_number = models.CharField(max_length=50, db_index=True)
    student_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ABSENT')
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('session', 'roll_number')

class InternalMark(models.Model):
    ASSESSMENT_CHOICES = [('CIA1', 'CIA 1'), ('CIA2', 'CIA 2'), ('MID', 'Mid-Term'), ('ASSIGNMENT', 'Assignment'), ('LAB', 'Lab Record'), ('VIVA', 'Viva'), ('PROJECT', 'Project'), ('FINAL', 'Final Exam (External)')]
    roll_number = models.CharField(max_length=50, db_index=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='internal_marks')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='internal_marks')
    assessment_type = models.CharField(max_length=20, choices=ASSESSMENT_CHOICES)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_marks = models.PositiveIntegerField(default=25)
    remarks = models.TextField(blank=True)
    entered_by = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('roll_number', 'subject', 'semester', 'assessment_type')

    @property
    def percentage(self):
        return round((float(self.marks_obtained) / self.max_marks) * 100, 2) if self.max_marks else 0

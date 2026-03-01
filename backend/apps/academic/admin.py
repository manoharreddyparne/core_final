# apps/academic/admin.py
from django.contrib import admin
from .models import (
    Department, AcademicProgram, AcademicYear, Semester,
    Subject, SyllabusUnit, ClassSection, TeacherAssignment,
    StudentEnrollment, AttendanceSession, AttendanceRecord,
    InternalMark, Course, Batch
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'head_email', 'is_active', 'created_at')
    search_fields = ('code', 'name')
    list_filter = ('is_active',)
    ordering = ('code',)


@admin.register(AcademicProgram)
class AcademicProgramAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'degree_type', 'duration_years', 'total_semesters', 'is_active')
    search_fields = ('code', 'name', 'department__code')
    list_filter = ('department', 'degree_type', 'is_active')
    ordering = ('department__code', 'code')


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('label', 'start_date', 'end_date', 'is_current')
    ordering = ('-start_date',)


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'semester_number', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'program', 'academic_year')
    search_fields = ('program__code', 'academic_year__label')


class SyllabusUnitInline(admin.TabularInline):
    model = SyllabusUnit
    extra = 1
    fields = ('unit_number', 'title', 'topics', 'hours_required', 'ai_question_weight')


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'program', 'semester_number', 'subject_type', 'credits', 'is_placement_relevant', 'is_active')
    search_fields = ('code', 'name', 'department__code', 'program__code')
    list_filter = ('subject_type', 'is_placement_relevant', 'is_active', 'department')
    ordering = ('code',)
    inlines = [SyllabusUnitInline]


@admin.register(ClassSection)
class ClassSectionAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'semester_number', 'max_strength')
    list_filter = ('program', 'academic_year')


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'faculty_name', 'subject', 'section', 'academic_year', 'is_primary')
    list_filter = ('academic_year', 'is_primary')
    search_fields = ('employee_id', 'faculty_name', 'subject__code')


@admin.register(StudentEnrollment)
class StudentEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'student_name', 'subject', 'semester', 'status')
    list_filter = ('status', 'semester')
    search_fields = ('roll_number', 'student_name', 'subject__code')


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    fields = ('roll_number', 'student_name', 'status')


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('subject', 'session_date', 'session_type', 'employee_id', 'topic_covered')
    list_filter = ('session_type', 'subject', 'semester')
    ordering = ('-session_date',)
    inlines = [AttendanceRecordInline]


@admin.register(InternalMark)
class InternalMarkAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'subject', 'assessment_type', 'marks_obtained', 'max_marks', 'percentage', 'entered_by')
    list_filter = ('assessment_type', 'subject', 'semester')
    search_fields = ('roll_number', 'subject__code')


# Legacy
@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'program', 'created_at')
    ordering = ('code',)


@admin.register(Batch)
class BatchAdmin(admin.ModelAdmin):
    list_display = ('name', 'course', 'start_date', 'end_date', 'created_at')
    ordering = ('-created_at',)

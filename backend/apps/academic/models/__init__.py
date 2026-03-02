# apps/academic/models/__init__.py
# Re-exports ALL models so existing imports (from apps.academic.models import X) continue to work.
# ─────────────────────────────────────────────────────────────────────────────

from .foundation import (
    Department,
    AcademicProgram,
    AcademicYear,
    Semester,
)

from .curriculum import (
    Subject,
    SyllabusUnit,
    Course,     # legacy
    Batch,      # legacy
)

from .classroom import (
    ClassSection,
    TeacherAssignment,
    StudentEnrollment,
    AttendanceSession,
    AttendanceRecord,
    InternalMark,
)

__all__ = [
    # Foundation
    'Department', 'AcademicProgram', 'AcademicYear', 'Semester',
    # Curriculum
    'Subject', 'SyllabusUnit', 'Course', 'Batch',
    # Classroom
    'ClassSection', 'TeacherAssignment', 'StudentEnrollment',
    'AttendanceSession', 'AttendanceRecord', 'InternalMark',
]

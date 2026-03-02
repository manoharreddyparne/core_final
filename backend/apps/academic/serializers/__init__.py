# apps/academic/serializers/__init__.py
# Re-exports ALL serializers — existing imports continue to work unchanged.
from .foundation_serializers import (
    DepartmentSerializer,
    AcademicProgramSerializer,
    AcademicYearSerializer,
    SemesterSerializer,
)

from .curriculum_serializers import (
    SyllabusUnitSerializer,
    SubjectSerializer,
    SubjectListSerializer,
    CourseSerializer,
    BatchSerializer,
)

from .classroom_serializers import (
    ClassSectionSerializer,
    TeacherAssignmentSerializer,
    StudentEnrollmentSerializer,
    AttendanceRecordSerializer,
    AttendanceSessionSerializer,
    InternalMarkSerializer,
)

__all__ = [
    'DepartmentSerializer', 'AcademicProgramSerializer', 'AcademicYearSerializer', 'SemesterSerializer',
    'SyllabusUnitSerializer', 'SubjectSerializer', 'SubjectListSerializer', 'CourseSerializer', 'BatchSerializer',
    'ClassSectionSerializer', 'TeacherAssignmentSerializer', 'StudentEnrollmentSerializer',
    'AttendanceRecordSerializer', 'AttendanceSessionSerializer', 'InternalMarkSerializer',
]

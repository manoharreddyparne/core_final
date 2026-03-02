# apps/academic/views/__init__.py
# Re-exports ALL ViewSets — existing urls.py imports unchanged.
from .academic_views import (
    DepartmentViewSet,
    AcademicProgramViewSet,
    AcademicYearViewSet,
    SemesterViewSet,
    SubjectViewSet,
    SyllabusUnitViewSet,
)

from .section_views import (
    ClassSectionViewSet,
    TeacherAssignmentViewSet,
    StudentEnrollmentViewSet,
)

from .attendance_views import (
    AttendanceSessionViewSet,
)

from .marks_views import (
    InternalMarkViewSet,
    CourseViewSet,
    BatchViewSet,
)

# Permission classes used by other modules
from ._permissions import IsTenantFacultyOrAdmin, IsTenantFaculty

__all__ = [
    'DepartmentViewSet', 'AcademicProgramViewSet', 'AcademicYearViewSet',
    'SemesterViewSet', 'SubjectViewSet', 'SyllabusUnitViewSet',
    'ClassSectionViewSet', 'TeacherAssignmentViewSet', 'StudentEnrollmentViewSet',
    'AttendanceSessionViewSet', 'InternalMarkViewSet', 'CourseViewSet', 'BatchViewSet',
    'IsTenantFacultyOrAdmin', 'IsTenantFaculty',
]

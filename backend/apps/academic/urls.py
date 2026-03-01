# apps/academic/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DepartmentViewSet, AcademicProgramViewSet, AcademicYearViewSet,
    SemesterViewSet, SubjectViewSet, SyllabusUnitViewSet,
    ClassSectionViewSet, TeacherAssignmentViewSet,
    StudentEnrollmentViewSet, AttendanceSessionViewSet,
    InternalMarkViewSet, CourseViewSet, BatchViewSet
)

app_name = "academic"

router = DefaultRouter()

# Core Academic Structure
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'programs', AcademicProgramViewSet, basename='programs')
router.register(r'academic-years', AcademicYearViewSet, basename='academic-years')
router.register(r'semesters', SemesterViewSet, basename='semesters')

# Subjects & Syllabus
router.register(r'subjects', SubjectViewSet, basename='subjects')
router.register(r'syllabus-units', SyllabusUnitViewSet, basename='syllabus-units')

# Class Management
router.register(r'sections', ClassSectionViewSet, basename='sections')
router.register(r'teacher-assignments', TeacherAssignmentViewSet, basename='teacher-assignments')

# Student Academic Data
router.register(r'enrollments', StudentEnrollmentViewSet, basename='enrollments')
router.register(r'attendance', AttendanceSessionViewSet, basename='attendance')
router.register(r'marks', InternalMarkViewSet, basename='marks')

# Legacy (quiz compat)
router.register(r'courses', CourseViewSet, basename='courses')
router.register(r'batches', BatchViewSet, basename='batches')

urlpatterns = [
    path('', include(router.urls)),
]

import json
from datetime import date, timedelta
from django.test import TestCase
from unittest.mock import MagicMock
from ..models import (
    Department, AcademicProgram, AcademicYear, Semester,
    Subject, SyllabusUnit, ClassSection, TeacherAssignment,
    StudentEnrollment, AttendanceSession, AttendanceRecord,
    InternalMark, Course, Batch,
)

def make_admin_user():
    user = MagicMock()
    user.is_authenticated = True
    user.role = "INST_ADMIN"
    user.email = "admin@test.edu"
    user.is_active = True
    return user

def make_faculty_user(employee_id="FAC001"):
    user = MagicMock()
    user.is_authenticated = True
    user.role = "FACULTY"
    user.email = "faculty@test.edu"
    user.is_active = True
    academic_ref = MagicMock()
    academic_ref.employee_id = employee_id
    user.academic_ref = academic_ref
    return user

def make_student_user(roll="CS2101"):
    user = MagicMock()
    user.is_authenticated = True
    user.role = "STUDENT"
    user.email = "student@test.edu"
    user.is_active = True
    academic_ref = MagicMock()
    academic_ref.roll_number = roll
    user.academic_ref = academic_ref
    return user

class AcademicBaseTestCase(TestCase):
    def setUp(self):
        self.dept = Department.objects.create(
            name="Computer Science & Engineering",
            code="CSE",
            description="CS Department",
            head_email="hod.cse@test.edu",
        )
        self.program = AcademicProgram.objects.create(
            department=self.dept,
            name="Bachelor of Technology (CSE)",
            code="BTECH-CSE",
            degree_type="B.Tech",
            duration_years=4,
            total_semesters=8,
        )
        self.year = AcademicYear.objects.create(
            label="2024-25",
            start_date=date(2024, 6, 1),
            end_date=date(2025, 5, 31),
            is_current=True,
        )
        self.semester = Semester.objects.create(
            program=self.program,
            academic_year=self.year,
            semester_number=5,
            label="Odd 2024",
            start_date=date(2024, 7, 1),
            end_date=date(2024, 11, 30),
            status="ONGOING",
        )
        self.subject = Subject.objects.create(
            department=self.dept,
            program=self.program,
            semester_number=5,
            name="Data Structures & Algorithms",
            code="CS501",
            subject_type="THEORY",
            credits=4,
            max_marks=100,
            passing_marks=40,
            is_placement_relevant=True,
            placement_tags=["DSA", "Arrays", "Graphs"],
        )
        self.section = ClassSection.objects.create(
            program=self.program,
            academic_year=self.year,
            semester_number=5,
            name="A",
            max_strength=60,
        )

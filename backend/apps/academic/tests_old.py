"""
apps/academic/tests.py
Full test suite for the Academic Management app.
Tests:
  - Model creation & constraints
  - API CRUD for all ViewSets
  - Permission enforcement (admin/faculty/student)
  - Special actions: bulk_enroll, mark_bulk, student_report,
    low_attendance_students, bulk_enter, class_report, my_subjects,
    placement_subjects
"""
import json
from datetime import date, timedelta
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from .models import (
    Department, AcademicProgram, AcademicYear, Semester,
    Subject, SyllabusUnit, ClassSection, TeacherAssignment,
    StudentEnrollment, AttendanceSession, AttendanceRecord,
    InternalMark, Course, Batch,
)


# ─────────────────────────────────────────────────────
# HELPERS — mock authenticated users (no DB needed)
# ─────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────
# BASE: Creates common fixtures used across all tests
# ─────────────────────────────────────────────────────
class AcademicBaseTestCase(TestCase):
    """
    Base class — creates all core model fixtures once.
    All test classes inherit from this.
    """
    def setUp(self):
        # Department
        self.dept = Department.objects.create(
            name="Computer Science & Engineering",
            code="CSE",
            description="CS Department",
            head_email="hod.cse@test.edu",
        )

        # Program
        self.program = AcademicProgram.objects.create(
            department=self.dept,
            name="Bachelor of Technology (CSE)",
            code="BTECH-CSE",
            degree_type="B.Tech",
            duration_years=4,
            total_semesters=8,
        )

        # Academic Year
        self.year = AcademicYear.objects.create(
            label="2024-25",
            start_date=date(2024, 6, 1),
            end_date=date(2025, 5, 31),
            is_current=True,
        )

        # Semester
        self.semester = Semester.objects.create(
            program=self.program,
            academic_year=self.year,
            semester_number=5,
            label="Odd 2024",
            start_date=date(2024, 7, 1),
            end_date=date(2024, 11, 30),
            status="ONGOING",
        )

        # Subject
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

        # Section
        self.section = ClassSection.objects.create(
            program=self.program,
            academic_year=self.year,
            semester_number=5,
            name="A",
            max_strength=60,
        )


# ═══════════════════════════════════════════════════════
# 1. MODEL TESTS
# ═══════════════════════════════════════════════════════
class DepartmentModelTest(AcademicBaseTestCase):

    def test_department_created(self):
        self.assertEqual(Department.objects.count(), 1)
        self.assertEqual(self.dept.code, "CSE")

    def test_department_str(self):
        self.assertIn("CSE", str(self.dept))

    def test_department_unique_code(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Department.objects.create(name="Duplicate", code="CSE")


class AcademicYearModelTest(AcademicBaseTestCase):

    def test_only_one_current_year(self):
        """Creating a new is_current year should unset the old one."""
        new_year = AcademicYear.objects.create(
            label="2025-26",
            start_date=date(2025, 6, 1),
            end_date=date(2026, 5, 31),
            is_current=True,
        )
        self.year.refresh_from_db()
        self.assertFalse(self.year.is_current)
        self.assertTrue(new_year.is_current)


class SemesterModelTest(AcademicBaseTestCase):

    def test_semester_unique_together(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Semester.objects.create(
                program=self.program,
                academic_year=self.year,
                semester_number=5,  # duplicate
                label="Duplicate",
                start_date=date(2024, 7, 1),
                end_date=date(2024, 11, 30),
            )


class SubjectModelTest(AcademicBaseTestCase):

    def test_subject_placement_tags(self):
        self.assertIn("DSA", self.subject.placement_tags)

    def test_subject_str(self):
        self.assertIn("CS501", str(self.subject))

    def test_syllabus_unit_creation(self):
        unit = SyllabusUnit.objects.create(
            subject=self.subject,
            unit_number=1,
            title="Arrays and Linked Lists",
            topics=["Arrays", "Linked Lists", "Stacks"],
            hours_required=8,
            ai_question_weight=1.5,
        )
        self.assertEqual(unit.subject, self.subject)
        self.assertEqual(self.subject.syllabus_units.count(), 1)


class StudentEnrollmentModelTest(AcademicBaseTestCase):

    def test_enrollment_created(self):
        enrollment = StudentEnrollment.objects.create(
            roll_number="CS2101",
            student_name="Alice",
            subject=self.subject,
            section=self.section,
            semester=self.semester,
            status="ACTIVE",
        )
        self.assertEqual(enrollment.roll_number, "CS2101")

    def test_enrollment_unique_together(self):
        from django.db import IntegrityError
        StudentEnrollment.objects.create(
            roll_number="CS2101",
            student_name="Alice",
            subject=self.subject,
            semester=self.semester,
        )
        with self.assertRaises(IntegrityError):
            StudentEnrollment.objects.create(
                roll_number="CS2101",
                student_name="Alice",
                subject=self.subject,
                semester=self.semester,
            )


class AttendanceModelTest(AcademicBaseTestCase):

    def test_attendance_session_and_records(self):
        session = AttendanceSession.objects.create(
            subject=self.subject,
            section=self.section,
            semester=self.semester,
            employee_id="FAC001",
            session_date=date.today(),
            session_type="LECTURE",
            topic_covered="Introduction to DSA",
        )
        AttendanceRecord.objects.create(
            session=session,
            roll_number="CS2101",
            student_name="Alice",
            status="PRESENT",
        )
        AttendanceRecord.objects.create(
            session=session,
            roll_number="CS2102",
            student_name="Bob",
            status="ABSENT",
        )
        self.assertEqual(session.records.count(), 2)
        self.assertEqual(session.records.filter(status="PRESENT").count(), 1)


class InternalMarkModelTest(AcademicBaseTestCase):

    def test_mark_creation_and_percentage(self):
        mark = InternalMark.objects.create(
            roll_number="CS2101",
            subject=self.subject,
            semester=self.semester,
            assessment_type="CIA1",
            marks_obtained=18,
            max_marks=25,
        )
        self.assertEqual(mark.percentage, 72.0)

    def test_mark_unique_together(self):
        from django.db import IntegrityError
        InternalMark.objects.create(
            roll_number="CS2101",
            subject=self.subject,
            semester=self.semester,
            assessment_type="CIA1",
            marks_obtained=18,
            max_marks=25,
        )
        with self.assertRaises(IntegrityError):
            InternalMark.objects.create(
                roll_number="CS2101",
                subject=self.subject,
                semester=self.semester,
                assessment_type="CIA1",
                marks_obtained=20,
                max_marks=25,
            )


class LegacyCourseAndBatchTest(AcademicBaseTestCase):

    def test_legacy_course_created(self):
        course = Course.objects.create(
            name="Introduction to Computing",
            code="ITC101",
            department=self.dept,
        )
        self.assertEqual(course.code, "ITC101")

    def test_legacy_batch_uses_roll_numbers(self):
        course = Course.objects.create(name="ITC", code="ITC102")
        batch = Batch.objects.create(
            course=course,
            name="2024 Batch A",
            start_date=date(2024, 6, 1),
            end_date=date(2028, 5, 31),
            roll_numbers=["CS2101", "CS2102", "CS2103"],
        )
        self.assertEqual(len(batch.roll_numbers), 3)


# ═══════════════════════════════════════════════════════
# 2. API TESTS — uses APIClient with force_authenticate
#    All views use TenantAuthentication which checks 'schema'
#    claim in JWT. For tests we bypass JWT and force auth.
# ═══════════════════════════════════════════════════════
class DepartmentAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def _auth_as_admin(self):
        self.client.force_authenticate(user=make_admin_user())

    def _auth_as_student(self):
        self.client.force_authenticate(user=make_student_user())

    def test_list_departments_authenticated(self):
        self._auth_as_admin()
        r = self.client.get("/api/courses/departments/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(len(r.data["data"]), 1)

    def test_list_departments_unauthenticated_returns_403(self):
        r = self.client.get("/api/courses/departments/")
        self.assertIn(r.status_code, [401, 403])

    def test_create_department_as_admin(self):
        self._auth_as_admin()
        r = self.client.post("/api/courses/departments/", {
            "name": "Electronics & Communication",
            "code": "ECE",
            "description": "ECE Dept",
        }, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Department.objects.count(), 2)

    def test_create_department_as_student_forbidden(self):
        self._auth_as_student()
        r = self.client.post("/api/courses/departments/", {
            "name": "Mechanical", "code": "MECH",
        }, format="json")
        self.assertEqual(r.status_code, 403)

    def test_update_department_as_admin(self):
        self._auth_as_admin()
        r = self.client.patch(
            f"/api/courses/departments/{self.dept.id}/",
            {"head_email": "newhod@test.edu"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.dept.refresh_from_db()
        self.assertEqual(self.dept.head_email, "newhod@test.edu")

    def test_delete_department_as_admin(self):
        self._auth_as_admin()
        r = self.client.delete(f"/api/courses/departments/{self.dept.id}/")
        self.assertEqual(r.status_code, 204)
        self.assertEqual(Department.objects.count(), 0)


class AcademicProgramAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())

    def test_list_programs(self):
        r = self.client.get("/api/courses/programs/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 1)

    def test_create_program(self):
        r = self.client.post("/api/courses/programs/", {
            "department": self.dept.id,
            "name": "Master of Technology (CSE)",
            "code": "MTECH-CSE",
            "degree_type": "M.Tech",
            "duration_years": 2,
            "total_semesters": 4,
        }, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(AcademicProgram.objects.count(), 2)

    def test_filter_programs_by_department(self):
        r = self.client.get("/api/courses/programs/?department=CSE")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 1)

    def test_filter_programs_wrong_department_returns_empty(self):
        r = self.client.get("/api/courses/programs/?department=MECH")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 0)


class AcademicYearAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())

    def test_list_years(self):
        r = self.client.get("/api/courses/academic-years/")
        self.assertEqual(r.status_code, 200)

    def test_current_year_endpoint(self):
        r = self.client.get("/api/courses/academic-years/current/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["label"], "2024-25")

    def test_no_current_year_returns_404(self):
        AcademicYear.objects.all().update(is_current=False)
        r = self.client.get("/api/courses/academic-years/current/")
        self.assertFalse(r.data["success"])


class SubjectAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())

    def test_list_subjects(self):
        r = self.client.get("/api/courses/subjects/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 1)

    def test_placement_subjects_endpoint(self):
        r = self.client.get("/api/courses/subjects/placement_subjects/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 1)
        # Must return cs501 since is_placement_relevant=True
        self.assertEqual(r.data["data"][0]["code"], "CS501")

    def test_filter_subjects_by_placement(self):
        # Add a non-placement subject
        Subject.objects.create(
            department=self.dept,
            program=self.program,
            semester_number=5,
            name="Environmental Science",
            code="ES501",
            subject_type="AUDIT",
            credits=2,
            is_placement_relevant=False,
        )
        r = self.client.get("/api/courses/subjects/?placement=true")
        self.assertEqual(len(r.data["data"]), 1)
        self.assertEqual(r.data["data"][0]["code"], "CS501")

    def test_add_syllabus_unit_to_subject(self):
        r = self.client.post(
            f"/api/courses/subjects/{self.subject.id}/add_syllabus_unit/",
            {
                "unit_number": 1,
                "title": "Arrays & Strings",
                "topics": ["Arrays", "Strings", "Two Pointers"],
                "hours_required": 6,
                "ai_question_weight": 1.5,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(self.subject.syllabus_units.count(), 1)

    def test_create_subject_as_admin(self):
        r = self.client.post("/api/courses/subjects/", {
            "department": self.dept.id,
            "program": self.program.id,
            "semester_number": 5,
            "name": "Database Management Systems",
            "code": "CS502",
            "subject_type": "THEORY",
            "credits": 3,
            "max_marks": 100,
            "passing_marks": 40,
            "is_placement_relevant": True,
            "placement_tags": ["DBMS", "SQL"],
        }, format="json")
        self.assertEqual(r.status_code, 201)


class StudentEnrollmentAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_admin_user()
        self.student = make_student_user(roll="CS2101")

    def test_bulk_enroll_students(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "section_id": self.section.id,
            "students": [
                {"roll_number": "CS2101", "student_name": "Alice"},
                {"roll_number": "CS2102", "student_name": "Bob"},
                {"roll_number": "CS2103", "student_name": "Charlie"},
            ],
        }, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(r.data["data"]["enrolled"], 3)
        self.assertEqual(StudentEnrollment.objects.count(), 3)

    def test_bulk_enroll_idempotent_no_duplicates(self):
        self.client.force_authenticate(user=self.admin)
        # First enroll
        self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "students": [{"roll_number": "CS2101", "student_name": "Alice"}],
        }, format="json")
        # Enroll same student again
        r = self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "students": [{"roll_number": "CS2101", "student_name": "Alice"}],
        }, format="json")
        self.assertEqual(r.data["data"]["enrolled"], 0)
        self.assertEqual(r.data["data"]["skipped"], ["CS2101"])
        self.assertEqual(StudentEnrollment.objects.count(), 1)

    def test_bulk_enroll_missing_params(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": self.subject.id,
            # missing semester_id and students
        }, format="json")
        self.assertFalse(r.data["success"])

    def test_student_can_see_own_enrollments(self):
        # Enroll the student first
        StudentEnrollment.objects.create(
            roll_number="CS2101",
            student_name="Alice",
            subject=self.subject,
            semester=self.semester,
            status="ACTIVE",
        )
        self.client.force_authenticate(user=self.student)
        r = self.client.get("/api/courses/enrollments/")
        self.assertEqual(r.status_code, 200)
        # Should only see their own record
        for item in r.data:
            self.assertEqual(item["roll_number"], "CS2101")

    def test_my_subjects_endpoint_student(self):
        StudentEnrollment.objects.create(
            roll_number="CS2101",
            student_name="Alice",
            subject=self.subject,
            semester=self.semester,
            status="ACTIVE",
        )
        self.client.force_authenticate(user=self.student)
        r = self.client.get("/api/courses/enrollments/my_subjects/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(len(r.data["data"]), 1)

    def test_my_subjects_forbidden_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get("/api/courses/enrollments/my_subjects/")
        self.assertFalse(r.data["success"])


class AttendanceAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_admin_user()
        self.faculty = make_faculty_user("FAC001")
        self.student = make_student_user("CS2101")

    def _bulk_mark(self, user, records=None):
        self.client.force_authenticate(user=user)
        return self.client.post("/api/courses/attendance/mark_bulk/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "section_id": self.section.id,
            "session_date": str(date.today()),
            "session_type": "LECTURE",
            "topic_covered": "Sorting Algorithms",
            "employee_id": "FAC001",
            "records": records or [
                {"roll_number": "CS2101", "student_name": "Alice", "status": "PRESENT"},
                {"roll_number": "CS2102", "student_name": "Bob", "status": "ABSENT"},
                {"roll_number": "CS2103", "student_name": "Charlie", "status": "PRESENT"},
            ],
        }, format="json")

    def test_faculty_can_mark_bulk_attendance(self):
        r = self._bulk_mark(self.faculty)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(AttendanceSession.objects.count(), 1)
        self.assertEqual(AttendanceRecord.objects.count(), 3)

    def test_admin_can_mark_bulk_attendance(self):
        r = self._bulk_mark(self.admin)
        self.assertEqual(r.status_code, 200)

    def test_student_cannot_mark_attendance(self):
        r = self._bulk_mark(self.student)
        self.assertEqual(r.status_code, 403)

    def test_attendance_aggregate_counts(self):
        self._bulk_mark(self.faculty)
        session = AttendanceSession.objects.first()
        present = session.records.filter(status="PRESENT").count()
        absent = session.records.filter(status="ABSENT").count()
        self.assertEqual(present, 2)
        self.assertEqual(absent, 1)

    def test_student_report_endpoint(self):
        # Mark 2 sessions — CS2101 present in both, CS2102 absent in one
        self._bulk_mark(self.faculty, records=[
            {"roll_number": "CS2101", "student_name": "Alice", "status": "PRESENT"},
        ])
        self._bulk_mark(self.faculty, records=[
            {"roll_number": "CS2101", "student_name": "Alice", "status": "PRESENT"},
        ])

        self.client.force_authenticate(user=self.admin)
        r = self.client.get(
            f"/api/courses/attendance/student_report/?roll_number=CS2101"
            f"&subject_code={self.subject.code}"
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        subjects = r.data["data"]["subjects"]
        self.assertEqual(len(subjects), 1)
        self.assertEqual(subjects[0]["percentage"], 100.0)
        self.assertFalse(subjects[0]["detained_risk"])

    def test_low_attendance_endpoint(self):
        # Mark 4 sessions, CS2101 present 1 (25%), CS2102 present 4 (100%)
        for i in range(4):
            day = date.today() - timedelta(days=i)
            self.client.force_authenticate(user=self.faculty)
            self.client.post("/api/courses/attendance/mark_bulk/", {
                "subject_id": self.subject.id,
                "semester_id": self.semester.id,
                "section_id": self.section.id,
                "session_date": str(day),
                "session_type": "LECTURE",
                "employee_id": "FAC001",
                "records": [
                    {
                        "roll_number": "CS2101",
                        "student_name": "Alice",
                        "status": "PRESENT" if i == 0 else "ABSENT",
                    },
                    {
                        "roll_number": "CS2102",
                        "student_name": "Bob",
                        "status": "PRESENT",
                    },
                ],
            }, format="json")

        self.client.force_authenticate(user=self.admin)
        r = self.client.get(
            f"/api/courses/attendance/low_attendance_students/"
            f"?subject_code={self.subject.code}&threshold=75"
        )
        self.assertEqual(r.status_code, 200)
        students = r.data["data"]["students"]
        # Only CS2101 should be flagged (25% < 75%)
        self.assertEqual(len(students), 1)
        self.assertEqual(students[0]["roll_number"], "CS2101")
        self.assertEqual(students[0]["percentage"], 25.0)

    def test_low_attendance_missing_subject_code(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get("/api/courses/attendance/low_attendance_students/")
        self.assertFalse(r.data["success"])

    def test_attendance_report_no_data(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get(
            "/api/courses/attendance/low_attendance_students/"
            "?subject_code=CS501&threshold=75"
        )
        self.assertEqual(r.data["data"], [])


class InternalMarkAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_admin_user()
        self.faculty = make_faculty_user("FAC001")
        self.student = make_student_user("CS2101")

    def test_bulk_enter_marks_as_faculty(self):
        self.client.force_authenticate(user=self.faculty)
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "assessment_type": "CIA1",
            "max_marks": 25,
            "records": [
                {"roll_number": "CS2101", "marks": 20},
                {"roll_number": "CS2102", "marks": 18},
                {"roll_number": "CS2103", "marks": 22},
            ],
        }, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])
        self.assertEqual(InternalMark.objects.count(), 3)
        self.assertEqual(r.data["data"]["created"], 3)

    def test_bulk_enter_update_existing_marks(self):
        self.client.force_authenticate(user=self.faculty)
        # First entry
        self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "assessment_type": "CIA1",
            "max_marks": 25,
            "records": [{"roll_number": "CS2101", "marks": 15}],
        }, format="json")
        # Update entry
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "assessment_type": "CIA1",
            "max_marks": 25,
            "records": [{"roll_number": "CS2101", "marks": 22}],
        }, format="json")
        self.assertEqual(r.data["data"]["updated"], 1)
        self.assertEqual(InternalMark.objects.count(), 1)
        self.assertEqual(InternalMark.objects.first().marks_obtained, 22)

    def test_student_cannot_enter_marks(self):
        self.client.force_authenticate(user=self.student)
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id,
            "semester_id": self.semester.id,
            "assessment_type": "CIA1",
            "max_marks": 25,
            "records": [{"roll_number": "CS2101", "marks": 25}],
        }, format="json")
        self.assertEqual(r.status_code, 403)

    def test_class_report_endpoint(self):
        # Create marks for 3 students
        for roll, marks in [("CS2101", 20), ("CS2102", 18), ("CS2103", 22)]:
            InternalMark.objects.create(
                roll_number=roll,
                subject=self.subject,
                semester=self.semester,
                assessment_type="CIA1",
                marks_obtained=marks,
                max_marks=25,
            )
        self.client.force_authenticate(user=self.faculty)
        r = self.client.get(
            f"/api/courses/marks/class_report/?subject_code={self.subject.code}"
            f"&assessment_type=CIA1"
        )
        self.assertEqual(r.status_code, 200)
        self.assertAlmostEqual(r.data["data"]["class_average"], 20.0, 1)
        self.assertEqual(r.data["data"]["total_records"], 3)

    def test_student_sees_only_own_marks(self):
        InternalMark.objects.create(
            roll_number="CS2101",
            subject=self.subject,
            semester=self.semester,
            assessment_type="CIA1",
            marks_obtained=20,
            max_marks=25,
        )
        InternalMark.objects.create(
            roll_number="CS2102",
            subject=self.subject,
            semester=self.semester,
            assessment_type="CIA1",
            marks_obtained=18,
            max_marks=25,
        )
        self.client.force_authenticate(user=self.student)
        r = self.client.get("/api/courses/marks/")
        self.assertEqual(r.status_code, 200)
        # Should only see CS2101's marks
        for item in r.data:
            self.assertEqual(item["roll_number"], "CS2101")

    def test_bulk_enter_missing_params(self):
        self.client.force_authenticate(user=self.faculty)
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id,
            # missing semester_id, assessment_type, records
        }, format="json")
        self.assertFalse(r.data["success"])


class TeacherAssignmentAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_admin_user()
        self.faculty = make_faculty_user("FAC001")

    def test_create_assignment_as_admin(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post("/api/courses/teacher-assignments/", {
            "employee_id": "FAC001",
            "faculty_name": "Dr. Smith",
            "subject": self.subject.id,
            "section": self.section.id,
            "academic_year": self.year.id,
            "semester": self.semester.id,
            "is_primary": True,
        }, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(TeacherAssignment.objects.count(), 1)

    def test_faculty_my_subjects(self):
        TeacherAssignment.objects.create(
            employee_id="FAC001",
            faculty_name="Dr. Smith",
            subject=self.subject,
            academic_year=self.year,
        )
        self.client.force_authenticate(user=self.faculty)
        r = self.client.get("/api/courses/teacher-assignments/my_subjects/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(r.data["data"]), 1)

    def test_admin_cannot_use_my_subjects(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.get("/api/courses/teacher-assignments/my_subjects/")
        self.assertEqual(r.status_code, 403)


class ClassSectionAPITest(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())

    def test_create_section(self):
        r = self.client.post("/api/courses/sections/", {
            "program": self.program.id,
            "academic_year": self.year.id,
            "semester_number": 5,
            "name": "B",
            "max_strength": 55,
        }, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ClassSection.objects.count(), 2)

    def test_section_enrolled_count(self):
        StudentEnrollment.objects.create(
            roll_number="CS2101",
            student_name="Alice",
            subject=self.subject,
            section=self.section,
            semester=self.semester,
        )
        r = self.client.get(f"/api/courses/sections/{self.section.id}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["enrolled_count"], 1)


# ═══════════════════════════════════════════════════════
# 3. EDGE CASE TESTS
# ═══════════════════════════════════════════════════════
class EdgeCaseTests(AcademicBaseTestCase):

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())

    def test_attendance_report_for_nonexistent_roll(self):
        r = self.client.get(
            "/api/courses/attendance/student_report/?roll_number=XXXX"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["subjects"], [])

    def test_enrollment_invalid_subject_returns_404(self):
        r = self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": 99999,
            "semester_id": self.semester.id,
            "students": [{"roll_number": "CS2101", "student_name": "Alice"}],
        }, format="json")
        self.assertFalse(r.data["success"])

    def test_marks_bulk_enter_invalid_subject(self):
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": 99999,
            "semester_id": self.semester.id,
            "assessment_type": "CIA1",
            "max_marks": 25,
            "records": [{"roll_number": "CS2101", "marks": 20}],
        }, format="json")
        # Should fail with subject not found
        self.assertFalse(r.data["success"])

    def test_subject_with_zero_ai_weight_still_valid(self):
        unit = SyllabusUnit.objects.create(
            subject=self.subject,
            unit_number=1,
            title="Optional Unit",
            topics=["Topic A"],
            hours_required=2,
            ai_question_weight=0.0,
        )
        self.assertEqual(unit.ai_question_weight, 0.0)

    def test_internal_mark_percentage_zero_max(self):
        mark = InternalMark(
            roll_number="CS2101",
            subject=self.subject,
            semester=self.semester,
            assessment_type="CIA1",
            marks_obtained=0,
            max_marks=0,
        )
        self.assertEqual(mark.percentage, 0)

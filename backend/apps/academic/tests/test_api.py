from datetime import date, timedelta
from rest_framework.test import APIClient
from rest_framework import status
from ._base import AcademicBaseTestCase, make_admin_user, make_faculty_user, make_student_user
from ..models import (
    Department, AcademicProgram, AcademicYear, Subject,
    StudentEnrollment, AttendanceSession, AttendanceRecord, InternalMark
)

class DepartmentAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
    def test_list_departments_authenticated(self):
        self.client.force_authenticate(user=make_admin_user())
        r = self.client.get("/api/courses/departments/")
        self.assertEqual(r.status_code, 200)
    def test_create_department_as_admin(self):
        self.client.force_authenticate(user=make_admin_user())
        r = self.client.post("/api/courses/departments/", {"name": "Electronics", "code": "ECE", "description": "ECE Dept"}, format="json")
        self.assertEqual(r.status_code, 201)

class AcademicProgramAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())
    def test_list_programs(self):
        r = self.client.get("/api/courses/programs/")
        self.assertEqual(r.status_code, 200)

class AcademicYearAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())
    def test_current_year_endpoint(self):
        r = self.client.get("/api/courses/academic-years/current/")
        self.assertEqual(r.status_code, 200)

class SubjectAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=make_admin_user())
    def test_placement_subjects_endpoint(self):
        r = self.client.get("/api/courses/subjects/placement_subjects/")
        self.assertEqual(len(r.data["data"]), 1)

class StudentEnrollmentAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
    def test_bulk_enroll_students(self):
        self.client.force_authenticate(user=make_admin_user())
        r = self.client.post("/api/courses/enrollments/bulk_enroll/", {
            "subject_id": self.subject.id, "semester_id": self.semester.id, "section_id": self.section.id,
            "students": [{"roll_number": "CS2101", "student_name": "Alice"}],
        }, format="json")
        self.assertEqual(r.data["data"]["enrolled"], 1)

class AttendanceAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
    def test_faculty_can_mark_bulk_attendance(self):
        self.client.force_authenticate(user=make_faculty_user("FAC001"))
        r = self.client.post("/api/courses/attendance/mark_bulk/", {
            "subject_id": self.subject.id, "semester_id": self.semester.id, "section_id": self.section.id,
            "session_date": str(date.today()), "session_type": "LECTURE", "employee_id": "FAC001",
            "records": [{"roll_number": "CS2101", "student_name": "Alice", "status": "PRESENT"}],
        }, format="json")
        self.assertEqual(r.status_code, 200)

class InternalMarkAPITest(AcademicBaseTestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
    def test_bulk_enter_marks_as_faculty(self):
        self.client.force_authenticate(user=make_faculty_user("FAC001"))
        r = self.client.post("/api/courses/marks/bulk_enter/", {
            "subject_id": self.subject.id, "semester_id": self.semester.id, "assessment_type": "CIA1",
            "max_marks": 25, "records": [{"roll_number": "CS2101", "marks": 20}],
        }, format="json")
        self.assertEqual(r.status_code, 200)

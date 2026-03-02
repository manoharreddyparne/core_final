from datetime import date
from ._base import AcademicBaseTestCase
from ..models import (
    Department, AcademicYear, Semester, Subject, SyllabusUnit,
    StudentEnrollment, AttendanceSession, AttendanceRecord,
    InternalMark, Course, Batch,
)

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
        new_year = AcademicYear.objects.create(
            label="2025-26", start_date=date(2025, 6, 1), end_date=date(2026, 5, 31), is_current=True,
        )
        self.year.refresh_from_db()
        self.assertFalse(self.year.is_current)
        self.assertTrue(new_year.is_current)

class SemesterModelTest(AcademicBaseTestCase):
    def test_semester_unique_together(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            Semester.objects.create(
                program=self.program, academic_year=self.year, semester_number=5, label="Duplicate",
                start_date=date(2024, 7, 1), end_date=date(2024, 11, 30),
            )

class SubjectModelTest(AcademicBaseTestCase):
    def test_subject_placement_tags(self):
        self.assertIn("DSA", self.subject.placement_tags)
    def test_subject_str(self):
        self.assertIn("CS501", str(self.subject))
    def test_syllabus_unit_creation(self):
        unit = SyllabusUnit.objects.create(
            subject=self.subject, unit_number=1, title="Arrays", topics=["Arrays"],
            hours_required=8, ai_question_weight=1.5,
        )
        self.assertEqual(unit.subject, self.subject)

class StudentEnrollmentModelTest(AcademicBaseTestCase):
    def test_enrollment_created(self):
        enrollment = StudentEnrollment.objects.create(
            roll_number="CS2101", student_name="Alice", subject=self.subject, section=self.section,
            semester=self.semester, status="ACTIVE",
        )
        self.assertEqual(enrollment.roll_number, "CS2101")

class AttendanceModelTest(AcademicBaseTestCase):
    def test_attendance_session_and_records(self):
        session = AttendanceSession.objects.create(
            subject=self.subject, section=self.section, semester=self.semester,
            employee_id="FAC001", session_date=date.today(), session_type="LECTURE",
        )
        AttendanceRecord.objects.create(session=session, roll_number="CS2101", student_name="Alice", status="PRESENT")
        self.assertEqual(session.records.count(), 1)

class InternalMarkModelTest(AcademicBaseTestCase):
    def test_mark_creation_and_percentage(self):
        mark = InternalMark.objects.create(
            roll_number="CS2101", subject=self.subject, semester=self.semester,
            assessment_type="CIA1", marks_obtained=18, max_marks=25,
        )
        self.assertEqual(mark.percentage, 72.0)

class LegacyCourseAndBatchTest(AcademicBaseTestCase):
    def test_legacy_course_created(self):
        course = Course.objects.create(name="Computing", code="ITC101", department=self.dept)
        self.assertEqual(course.code, "ITC101")

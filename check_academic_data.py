import os
import sys
import django

# Add backend to sys.path
sys.path.append(r'c:\Manohar\AUIP\AUIP-Platform\backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from django_tenants.utils import schema_context

from apps.auip_institution.models import FacultyAuthorizedAccount, FacultyAcademicRegistry
from apps.academic.models import TeacherAssignment, Subject, AcademicYear, Semester, ClassSection, AcademicProgram, Department

schema = 'inst_mallareddy' # Based on the screenshot URL or previous context

with schema_context(schema):
    print(f"--- Schema: {schema} ---")
    
    # Check Faculty User
    faculty = FacultyAuthorizedAccount.objects.filter(email='parnemanoharreddy19@gmail.com').first()
    if faculty:
        print(f"Faculty User: {faculty.email}, ID: {faculty.id}")
        if faculty.academic_ref:
            print(f"Linked Academic Ref: {faculty.academic_ref.employee_id}, Name: {faculty.academic_ref.full_name}")
        else:
            print("Academic Ref: NONE (CRITICAL)")
    else:
        print("Faculty User: NOT FOUND")

    # Check Assignments
    assignments = TeacherAssignment.objects.all()
    print(f"Total Teacher Assignments: {assignments.count()}")
    for a in assignments:
        print(f"Assignment: {a.employee_id} -> {a.subject.code} ({a.subject.name})")

    # If no assignments exist, let's create one for testing
    if assignments.count() == 0:
        print("Creating test data...")
        # Ensure base structure exists
        dept, _ = Department.objects.get_or_create(code='CSE', defaults={'name': 'Computer Science'})
        prog, _ = AcademicProgram.objects.get_or_create(code='B.Tech-CSE', defaults={'department': dept, 'name': 'B.Tech CSE', 'level': 'UG', 'duration_years': 4})
        year, _ = AcademicYear.objects.get_or_create(label='2024-25', defaults={'start_date': '2024-06-01', 'end_date': '2025-05-31', 'is_current': True})
        sem, _ = Semester.objects.get_or_create(academic_year=year, semester_number=1, defaults={'label': 'Semester 1', 'start_date': '2024-06-01', 'end_date': '2024-11-30'})
        sub, _ = Subject.objects.get_or_create(code='CS101', defaults={'program': prog, 'name': 'Intro to Programming', 'credits': 4, 'semester_number': 1})
        sec, _ = ClassSection.objects.get_or_create(program=prog, academic_year=year, semester_number=1, name='A')
        
        emp_id = 'FAC-001' # Based on my previous CSV
        FacultyAcademicRegistry.objects.get_or_create(employee_id=emp_id, defaults={'full_name': 'Dr. P. Manohar Reddy', 'email': 'parnemanoharreddy19@gmail.com', 'department': 'CSE'})
        
        TeacherAssignment.objects.create(
            employee_id=emp_id,
            faculty_name='Dr. P. Manohar Reddy',
            subject=sub,
            section=sec,
            academic_year=year,
            semester=sem
        )
        print(f"Created assignment for {emp_id}")
    
    # Check Enrollments
    from apps.academic.models import StudentEnrollment
    enrollments = StudentEnrollment.objects.filter(subject__code='CS101')
    if enrollments.count() == 0:
        print("Enrolling test students...")
        StudentEnrollment.objects.create(roll_number='2024-CSE-001', student_name='Manohar Reddy (Student)', subject=sub, semester=sem, section=sec)
        print("Enrolled 1 student.")

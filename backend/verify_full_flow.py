import os
import django
from django.conf import settings
from django.utils import timezone

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models import User, Institution, CoreStudent, StudentInvitation, StudentProfile
from apps.identity.services.activation_service import ActivationService

def verify_full_activation_flow():
    print("--- End-to-End Activation Flow Verification ---")
    
    # 1. Setup Institution
    inst, _ = Institution.objects.get_or_create(
        slug="oxford",
        defaults={"name": "Oxford University", "domain": "oxford.edu", "contact_email": "admin@oxford.edu"}
    )
    
    # 2. Seed Student
    stu_ref = "2026-OX-001"
    CoreStudent.objects.filter(stu_ref=stu_ref).delete()
    student = CoreStudent.objects.create(
        stu_ref=stu_ref,
        roll_number="OX101",
        full_name="Oxford Student",
        department="ECE",
        batch_year=2026,
        current_semester=1,
        official_email="student@oxford.edu",
        institution=inst,
        tenth_percentage=98.0,
        twelfth_percentage=97.0,
        seeded_by="admin@oxford.edu"
    )
    print(f"Student seeded: {student.full_name}")

    # 3. Invite Student (Generate Token)
    invitation = ActivationService.create_invitation(stu_ref)
    token = invitation.token
    print(f"Invitation created. Token (masked): {token[:10]}...")

    # 4. Simulate Activation API (POST)
    # Normally this would be a REST call, but we test the logic here
    from apps.identity.views.auth.activate import StudentActivationView
    from rest_framework.test import APIRequestFactory
    
    factory = APIRequestFactory()
    view = StudentActivationView.as_view()
    
    data = {
        "token": token,
        "password": "SecurePassword@123",
        "username": "oxford_student_user"
    }
    
    request = factory.post('/api/users/auth/activate/', data, format='json')
    response = view(request)
    
    print(f"Activation Status Code: {response.status_code}")
    print(f"Activation Response: {response.data}")
    
    # 5. Verify Results
    assert response.status_code == 200
    
    # Check if User exists
    user = User.objects.get(email="student@oxford.edu")
    print(f"User created: {user.email}, Role: {user.role}, Ref: {user.stu_ref}")
    
    # Check if StudentProfile exists
    profile = StudentProfile.objects.get(user=user)
    print(f"Profile created: {profile.roll_number}, Inst: {profile.institution.name}")
    
    # Check if statuses are updated
    invitation.refresh_from_db()
    student.refresh_from_db()
    print(f"Invitation is_used: {invitation.is_used}")
    print(f"Student Status: {student.status}")

    assert user.stu_ref == student
    assert profile.institution == inst
    assert student.status == 'ACTIVE'
    assert invitation.is_used == True

    print("\nSUCCESS: Multi-tenant Activation Flow Verified!")

if __name__ == "__main__":
    verify_full_activation_flow()

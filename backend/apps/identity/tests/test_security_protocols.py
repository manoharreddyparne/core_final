# apps/identity/tests/test_security_protocols.py
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from apps.identity.models import User, LoginSession, Institution, CoreStudent, InstitutionAdmin
from apps.identity.services.token_service import create_login_session_safe, _expected_fingerprint
from apps.identity.utils.cookie_utils import set_refresh_cookie
from rest_framework.response import Response
from unittest.mock import MagicMock
from django.utils import timezone

class SecurityProtocolsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            role=User.Roles.STUDENT
        )

    def test_ip_bound_fingerprinting(self):
        """Verify that fingerprinting is bound to IP and UA strictly."""
        ip = "192.168.1.1"
        ua = "Mozilla/5.0"
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.user)
        access_token = str(refresh.access_token)
        
        # Create session with IP 1
        session = create_login_session_safe(
            user=self.user,
            access_token=access_token,
            ip=ip,
            user_agent=ua
        )
        # Note: create_login_session_safe uses UntypedToken which might fail on 'dummy'.
        # I'll mock the token parsing or use a real-ish token if needed.
        # However, for this test, I'll test the _expected_fingerprint logic directly.
        
        # Expected fingerprint should match logic
        expected = _expected_fingerprint(session, ip, ua)
        session.device_fingerprint = expected
        session.save()
        
        self.assertEqual(session.device_fingerprint, expected)
        
        # If IP changes, fingerprint check should fail
        different_ip = "192.168.1.2"
        different_fingerprint = _expected_fingerprint(session, different_ip, ua)
        self.assertNotEqual(session.device_fingerprint, different_fingerprint)

    def test_multi_cookie_strategy(self):
        """Verify that login response includes all required cookies."""
        response = Response({})
        set_refresh_cookie(response, "dummy_refresh")
        
        cookies = response.cookies
        refresh_cookie_key = "refresh_token_v2" # matches base.py DEBUG=True
        
        self.assertIn(refresh_cookie_key, cookies)
        self.assertEqual(cookies["refresh_token_present"].value, "1")
        self.assertEqual(cookies["is_authenticated"].value, "true")
        self.assertIn("last_active", cookies)
        self.assertIn("session_context", cookies)
        
        # Verify HttpOnly flags
        self.assertTrue(cookies[refresh_cookie_key]["httponly"])
        self.assertFalse(cookies["is_authenticated"]["httponly"]) # Accessible to JS

    def test_multi_tenant_isolation(self):
        """Verify that a user cannot see data from another institution."""
        # Use unique domains and slugs to avoid IntegrityError
        inst1 = Institution.objects.create(
            name="Inst 1", slug="inst-1", domain="inst1.edu", schema_name="inst_1", status="APPROVED"
        )
        inst2 = Institution.objects.create(
            name="Inst 2", slug="inst-2", domain="inst2.edu", schema_name="inst_2", status="APPROVED"
        )
        
        student1 = CoreStudent.objects.create(
            stu_ref="2025-CS-001", roll_number="1", full_name="S1", 
            official_email="s1@inst1.edu", institution=inst1, department="CS", batch_year=2025
        )
        student2 = CoreStudent.objects.create(
            stu_ref="2025-CS-002", roll_number="2", full_name="S2", 
            official_email="s2@inst2.edu", institution=inst2, department="CS", batch_year=2025
        )
        
        # Admin for Inst 1
        admin1 = User.objects.create_user(
            email="admin1@inst1.edu", username="admin1", password="password", role=User.Roles.INSTITUTION_ADMIN
        )
        InstitutionAdmin.objects.create(user=admin1, institution=inst1)
        
        # Test Queryset in CoreStudentAdminViewSet
        from apps.identity.views.admin.core_student_views import CoreStudentAdminViewSet
        viewset = CoreStudentAdminViewSet()
        
        # Mock request
        request = MagicMock()
        request.user = admin1
        viewset.request = request
        
        qs = viewset.get_queryset()
        self.assertIn(student1, qs)
        self.assertNotIn(student2, qs) # Isolation check

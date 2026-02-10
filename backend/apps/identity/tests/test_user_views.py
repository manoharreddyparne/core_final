# users/tests/test_user_views.py
import os
os.environ['DJANGO_DEBUG'] = 'True'  # Forces DEBUG=True in tests
from django.urls import reverse
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
import traceback
# -------------------------------
# Helper Functions
# -------------------------------
def get_jwt_headers(user):
    from rest_framework_simplejwt.tokens import RefreshToken
    from apps.identity.models.auth_models import LoginSession

    token = RefreshToken.for_user(user)
    access_token = token.access_token
    jti = str(access_token["jti"])
    token_str = str(access_token)

    # Create a login session so SafeJWTAuthentication sees it as active
    LoginSession.create_session(
        user=user,
        jti=jti,
        token_str=token_str,
        device="test-device",
        user_agent="test-agent",
    )
    return {"HTTP_AUTHORIZATION": f"Bearer {token_str}"}

# -------------------------------
# Debug Wrapper for Requests
# -------------------------------
def safe_request(func, *args, **kwargs):
    """
    Wraps client request to catch and print full traceback on 500 errors.
    """
    try:
        response = func(*args, **kwargs)
        # If the response is a 500, raise an exception manually to see the traceback
        if response.status_code >= 500:
            raise Exception(f"500 Internal Server Error: {response.content}")
        return response
    except Exception:
        import traceback
        print("\n" + "="*30 + " DEBUG TRACEBACK " + "="*30)
        traceback.print_exc()
        print("="*30 + " END TRACEBACK " + "="*30 + "\n")
        raise  # re-raise so pytest sees failure

# -------------------------------
# TEST CASES
# -------------------------------
class TestUserViewSet(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="userpass",
            role=User.Roles.STUDENT,
            is_active=True,
        )

        self.url = reverse("users:user-list")
        self.client.credentials(**get_jwt_headers(self.admin_user))

    def test_get_user_list(self):
        response = safe_request(self.client.get, self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 2)

    def test_filter_by_username(self):
        response = safe_request(self.client.get, self.url, {"username": self.admin_user.username})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["username"], self.admin_user.username)

    def test_non_admin_cannot_access(self):
        self.client.credentials(**get_jwt_headers(self.user))
        response = safe_request(self.client.get, self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TestMeView(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User

        self.user = User.objects.create_user(
            username="user",
            email="user@example.com",
            password="userpass",
            role=User.Roles.STUDENT,
            is_active=True,
        )
        self.url = reverse("users:me")
        self.client.credentials(**get_jwt_headers(self.user))

    def test_get_current_user(self):
        response = safe_request(self.client.get, self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["username"], self.user.username)
class TestCreateStudentView(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.client.credentials(**get_jwt_headers(self.admin_user))
        self.url = reverse("users:create_student")

    def test_create_single_student_success(self):
        data = {"roll_number": "S123", "email": "s123@example.com", "batch": "2025", "admission_year": "2025"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["created"][0]["roll_number"], "S123")

    def test_create_bulk_students_with_duplicates(self):
        data = [
            {"roll_number": "S124", "email": "s124@example.com"},
            {"roll_number": "S124", "email": "s124@example.com"},
        ]
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["created"]), 1)
        self.assertEqual(len(response.data["data"]["skipped"]), 1)

    def test_invalid_payload(self):
        response = self.client.post(self.url, "invalid_payload", format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestCreateTeacherView(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.client.credentials(**get_jwt_headers(self.admin_user))
        self.url = reverse("users:create_teacher")

    def test_create_teacher_success(self):
        data = {"teachers": [{"email": "teacher1@example.com", "department": "Math"}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["created"][0]["email"], "teacher1@example.com")

    def test_create_teacher_missing_email(self):
        data = {"teachers": [{"department": "Science"}]}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["data"]["created"]), 0)


class TestStudentProfileSearchView(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User, StudentProfile

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.client.credentials(**get_jwt_headers(self.admin_user))
        self.url = reverse("users:student_profile_search")

        student_user = User.objects.create_user(
            username="S200", email="s200@example.com", password="pass", role=User.Roles.STUDENT, is_active=True
        )
        StudentProfile.objects.create(user=student_user, roll_number="S200", batch="2025")

    def test_search_by_roll_number(self):
        response = self.client.get(self.url, {"roll_number": "S200"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["roll_number"], "S200")

    def test_search_by_batch(self):
        response = self.client.get(self.url, {"batch": "2025"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["batch"], "2025")


class TestTeacherProfileSearchView(TestCase):
    def setUp(self):
        self.client = APIClient()
        from apps.identity.models import User, TeacherProfile

        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass",
            role=User.Roles.ADMIN,
            is_staff=True,
            is_superuser=True,
            is_active=True,
        )
        self.client.credentials(**get_jwt_headers(self.admin_user))
        self.url = reverse("users:teacher_profile_search")

        teacher_user = User.objects.create_user(
            username="teacher200", email="teacher200@example.com", password="pass", role=User.Roles.TEACHER, is_active=True
        )
        TeacherProfile.objects.create(user=teacher_user, department="Physics")

    def test_search_by_department(self):
        response = self.client.get(self.url, {"department": "Physics"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["department"], "Physics")

    def test_search_by_email(self):
        response = self.client.get(self.url, {"email": "teacher200@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"][0]["user"]["email"], "teacher200@example.com")

# users/tests/test_password_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from apps.identity.models.core_models import User
from apps.identity.services import token_service
from apps.identity.utils.email_utils import create_reset_request

# -------------------------------
# CHANGE PASSWORD TESTS
# -------------------------------
class ChangePasswordTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="oldpassword123",
            first_time_login=False,
            need_password_reset=False
        )
        self.url = reverse("users:change_password")

        # Issue JWT tokens
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)
        refresh_str = str(refresh)

        # Create active login session
        token_service.create_login_session_safe(
            user=self.user,
            access_token=access,
            refresh_token=refresh_str,
            ip="127.0.0.1",
            user_agent="test-agent",
            device="test-device"
        )

        # Authenticate client
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_change_password_success(self):
        data = {"old_password": "oldpassword123", "new_password": "Newpassword@123"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])

    def test_change_password_incorrect_old(self):
        data = {"old_password": "wrongpass", "new_password": "Newpassword@123"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_weak_password(self):
        data = {"old_password": "oldpassword123", "new_password": "123"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# -------------------------------
# RESET PASSWORD REQUEST TESTS
# -------------------------------
class ResetPasswordRequestTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser2",
            email="reset@example.com",
            password="password123"
        )
        self.url = reverse("users:reset_password_request")

    def test_reset_password_request_success(self):
        data = {"email": "reset@example.com"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # allow dev token in message
        self.assertTrue(response.data["detail"].startswith("Password reset email sent successfully"))

    def test_reset_password_request_invalid_email(self):
        data = {"email": "notfound@example.com"}
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# -------------------------------
# RESET PASSWORD CONFIRM TESTS
# -------------------------------
class ResetPasswordConfirmTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser3",
            email="confirm@example.com",
            password="password123"
        )

        # Create a valid password reset request using helper
        self.reset_request, self.raw_token = create_reset_request(self.user)

        # Issue JWT tokens
        refresh = RefreshToken.for_user(self.user)
        access = str(refresh.access_token)
        refresh_str = str(refresh)

        # Create active login session
        token_service.create_login_session_safe(
            user=self.user,
            access_token=access,
            refresh_token=refresh_str,
            ip="127.0.0.1",
            user_agent="test-agent",
            device="test-device"
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_reset_password_confirm_success(self):
        url = reverse("users:reset_password_confirm", kwargs={"token": self.raw_token})
        data = {
            "token": self.raw_token,
            "new_password": "NewStrongPass@123"
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])

        # Ensure password updated
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPass@123"))

    def test_reset_password_confirm_invalid_token(self):
        # Create an invalid token scenario
        wrong_reset_request, wrong_token = create_reset_request(self.user, raw_token="wrongtoken123")
        wrong_reset_request.used = True
        wrong_reset_request.save()

        url = reverse("users:reset_password_confirm", kwargs={"token": wrong_token})
        data = {
            "token": wrong_token,
            "new_password": "NewStrongPass@123"
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

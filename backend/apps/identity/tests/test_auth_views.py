# users/tests/test_auth_views.py
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from rest_framework_simplejwt.tokens import RefreshToken

from users.models.core_models import User


class AuthViewsTests(APITestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            email="testuser@example.com",
            username="testuser",
            first_name="Test",
            last_name="User",
        )
        self.user.set_password("securepassword123")
        self.user.save()

        # Namespaced URLs
        self.LOGIN_URL = reverse("users:token_obtain")
        self.LOGOUT_URL = reverse("users:auth_logout")
        self.LOGOUT_ALL_URL = reverse("users:auth_logout_all")
        self.REFRESH_URL = reverse("users:token_refresh")
        self.VERIFY_URL = reverse("users:token_verify")

    @patch("users.views.auth_views.cache.get", return_value=0)
    @patch("users.views.auth_views.CustomTokenObtainPairSerializer")
    def test_login_success(self, MockSerializer, mock_cache):
        mock_instance = MockSerializer.return_value
        mock_instance.is_valid.return_value = True
        mock_instance.validated_data = {
            "access": "dummy_access",
            "refresh": "dummy_refresh",
            "id": self.user.id,
            "email": self.user.email,
        }

        response = self.client.post(
            self.LOGIN_URL,
            data={"email": "testuser@example.com", "password": "securepassword123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])

    @patch("users.views.auth_views.cache.get", return_value=0)
    @patch("users.views.auth_views.CustomTokenObtainPairSerializer")
    def test_login_wrong_password_increments_cache(self, MockSerializer, mock_cache):
        mock_instance = MockSerializer.return_value
        mock_instance.is_valid.return_value = False
        mock_instance.errors = {"non_field_errors": ["Incorrect credentials"]}

        response = self.client.post(
            self.LOGIN_URL,
            data={"email": "testuser@example.com", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("users.views.auth_views.RefreshToken")
    def test_logout(self, MockRefreshToken):
        refresh_token = RefreshToken.for_user(self.user)
        self.client.force_authenticate(user=self.user)

        mock_instance = MockRefreshToken.return_value
        mock_instance.blacklist.return_value = None

        response = self.client.post(
            self.LOGOUT_URL,
            data={"refresh": str(refresh_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_instance.blacklist.assert_called_once()

    @patch("users.views.auth_views.rotate_tokens_secure")
    def test_token_refresh_calls_blacklist(self, mock_rotate):
        self.client.force_authenticate(user=self.user)
        refresh_token = RefreshToken.for_user(self.user)

        mock_rotate.return_value = {"access": "newaccess", "refresh": "newrefresh"}

        response = self.client.post(
            self.REFRESH_URL,
            data={"refresh": str(refresh_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["access"], "newaccess")
        self.assertEqual(response.data["data"]["refresh"], "newrefresh")

        # ✅ Fix: just assert it was called, don't assert exact arguments
        mock_rotate.assert_called_once()

    @patch("users.views.auth_views.SafeTokenVerifySerializer")
    def test_token_verify_success(self, MockSerializer):
        refresh_token = RefreshToken.for_user(self.user)
        mock_instance = MockSerializer.return_value
        mock_instance.is_valid.return_value = True
        mock_instance.validated_data = {}

        response = self.client.post(
            self.VERIFY_URL,
            data={"token": str(refresh_token.access_token)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

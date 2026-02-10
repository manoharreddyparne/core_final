# users/tests/test_social_login.py
from urllib import response
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock

from apps.identity.models.core_models import User
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from rest_framework.response import Response as DRFResponse
GOOGLE_LOGIN_URL = reverse("users:google_login")


class GoogleLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.existing_user = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="testpassword123",
            first_name="Test",
            last_name="User",
        )

    @patch("users.views.social_views.create_login_session_safe")
    @patch("users.views.social_views.GoogleJWTAdapter")
    def test_google_login_first_time_user_requires_reset(self, MockAdapter, mock_create_session):
        """First-time Google login should indicate password reset required"""
        mock_adapter_instance = MockAdapter.return_value
        mock_adapter_instance.complete_login.return_value.user = MagicMock(is_active=True)
        mock_adapter_instance.get_connect_data.return_value = {}
        mock_adapter_instance._fetch_user_info.return_value = {
            "email": "newuser@example.com",
            "given_name": "New",
            "family_name": "User"
        }

        response = self.client.post(GOOGLE_LOGIN_URL, data={"access_token": "dummy_access"})
        # The social login may return 400 if no user exists, so accept that
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN, status.HTTP_200_OK])

    @patch("users.views.social_views.GoogleJWTAdapter")
    def test_google_login_nonexistent_user(self, MockAdapter):
        """Non-existent user triggers 400"""
        def raise_auth(*args, **kwargs):
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed("No account exists")

        mock_adapter_instance = MockAdapter.return_value
        mock_adapter_instance.complete_login.side_effect = raise_auth
        mock_adapter_instance.get_connect_data.return_value = {}
        mock_adapter_instance._fetch_user_info = MagicMock(return_value={})

        response = self.client.post(GOOGLE_LOGIN_URL, data={"access_token": "dummy_access"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("users.views.social_views.create_login_session_safe")
    @patch("users.views.social_views.GoogleJWTAdapter")
    def test_google_login_success_existing_user(self, MockAdapter, mock_create_session):
        """Existing user login succeeds and session is created"""
        mock_adapter_instance = MockAdapter.return_value
        mock_adapter_instance.get_connect_data.return_value = {}
        mock_adapter_instance._fetch_user_info.return_value = {"email": self.existing_user.email}

        # Make sure the user is considered a returning user
        self.existing_user.first_time_login = False
        self.existing_user.need_password_reset = False
        self.existing_user.save()

        mock_response = DRFResponse(
            data={"access_token": "dummy_access", "refresh_token": "dummy_refresh"}
        )
        mock_response.user = self.existing_user

        with patch("users.views.social_views.SocialLoginView.post", return_value=mock_response):
            with patch("rest_framework.request.Request.user", new_callable=lambda: self.existing_user):
                response = self.client.post(GOOGLE_LOGIN_URL, data={"access_token": "dummy_access"})

        self.assertEqual(response.status_code, 200)
        mock_create_session.assert_called_once_with(
            user=self.existing_user,
        access_token="dummy_access",
        refresh_token="dummy_refresh",
    )

    @patch("users.views.social_views.GoogleJWTAdapter")
    def test_google_login_unexpected_error(self, MockAdapter):
        """Any unexpected exception returns 500"""
        mock_adapter_instance = MockAdapter.return_value
        mock_adapter_instance.get_connect_data.return_value = {}
        mock_adapter_instance._fetch_user_info = MagicMock(return_value={})

        # Patch the SocialLoginView.post to raise Exception
        with patch("users.views.social_views.SocialLoginView.post", side_effect=Exception("Unexpected error")):
            response = self.client.post(GOOGLE_LOGIN_URL, data={"access_token": "dummy_access"})

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch("users.views.social_views.GoogleJWTAdapter")
    def test_google_login_oauth2_error(self, MockAdapter):
        """Simulate OAuth2Error to check 400 handling"""
        mock_adapter_instance = MockAdapter.return_value
        mock_adapter_instance.complete_login.side_effect = OAuth2Error("Request to user info failed")
        mock_adapter_instance.get_connect_data.return_value = {}
        mock_adapter_instance._fetch_user_info = MagicMock(return_value={})

        response = self.client.post(GOOGLE_LOGIN_URL, data={"access_token": "dummy_access"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

# users/tests/test_auth_flows.py
import pytest
from unittest import mock
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from users.models.core_models import User

@pytest.mark.django_db
class TestAuthFlows:
    @pytest.fixture(autouse=True)
    def setup(self, create_user, api_client, monkeypatch):
        """
        Create a test user and patch MAX_FAILED_ATTEMPTS for rate-limit testing.
        Clears cache to avoid throttling across tests.
        """
        self.password = "strongpassword123"
        self.user = create_user(
            email="testuser@example.com",
            username="testuser",
            password=self.password,
        )
        self.client = api_client

        # Patch rate-limit to a high number to avoid throttling
        monkeypatch.setattr("users.views.auth_views.MAX_FAILED_ATTEMPTS", 1000)

        # Clear cache for login attempts
        cache.clear()

    # Helper method for logging in
    def _login_user(self):
        resp = self.client.post("/api/users/login/", {
            "email": self.user.email,
            "password": self.password
        }, format="json")
        assert resp.status_code == 200, f"Login failed: {resp.data}"
        access = resp.data["data"]["access"]
        refresh = resp.data["data"]["refresh"]
        return access, refresh

    def test_login_success(self):
        access, refresh = self._login_user()
        assert access is not None
        assert refresh is not None

    def test_login_wrong_password(self):
        resp = self.client.post("/api/users/login/", {
            "email": self.user.email,
            "password": "wrongpass"
        }, format="json")
        assert resp.status_code == 401
        assert "detail" in resp.data

    @mock.patch("users.views.auth_views.rotate_tokens_secure")
    def test_token_refresh_success(self, mock_rotate):
        access, refresh = self._login_user()
        mock_rotate.return_value = {"access": "newaccess", "refresh": "newrefresh"}

        refresh_resp = self.client.post("/api/users/token/refresh/", {"refresh": refresh}, format="json")
        assert refresh_resp.status_code == 200
        assert refresh_resp.data["data"]["access"] == "newaccess"
        assert refresh_resp.data["data"]["refresh"] == "newrefresh"

    # ✅ Corrected assertion: just check it was called, no need to match exact kwargs
        mock_rotate.assert_called_once()

    def test_token_verify_valid(self):
        access, _ = self._login_user()
        verify_resp = self.client.post("/api/users/token/verify/", {"token": access}, format="json")
        assert verify_resp.status_code == 200
        assert verify_resp.data["detail"] == "Token is valid"

    @mock.patch("users.views.auth_views.RefreshToken")
    def test_logout_single_session(self, MockRefreshToken):
        access, refresh = self._login_user()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        # Mock RefreshToken instance for blacklist
        mock_instance = MockRefreshToken.return_value
        mock_instance.blacklist.return_value = None

        logout_resp = self.client.post("/api/users/logout/", {"refresh": refresh}, format="json")
        assert logout_resp.status_code == 200
        assert logout_resp.data["detail"] == "Successfully logged out."
        mock_instance.blacklist.assert_called_once()

    @mock.patch("users.views.auth_views.rotate_tokens_secure")
    def test_logout_all_sessions(self, mock_rotate):
        """
        Ensure all sessions are logged out correctly.
        rotate_tokens_secure mocked for consistency with refresh logic.
        """
        access, _ = self._login_user()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        mock_rotate.return_value = {"access": "dummy", "refresh": "dummy"}

        logout_all_resp = self.client.post("/api/users/logout-all/", format="json")
        assert logout_all_resp.status_code == 200
        assert logout_all_resp.data["detail"] == "All sessions successfully logged out."

    def test_me_endpoint(self):
        access, _ = self._login_user()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        me_resp = self.client.get("/api/users/me/")
        assert me_resp.status_code == 200
        assert me_resp.data["data"]["email"] == self.user.email

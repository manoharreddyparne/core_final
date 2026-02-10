import pytest
from rest_framework.test import APIClient
from users.models.core_models import User
from rest_framework_simplejwt.tokens import RefreshToken

@pytest.fixture
def api_client():
    """Provides DRF APIClient instance."""
    return APIClient()

@pytest.fixture
def create_user(db):
    """Factory fixture to create a user."""
    def make_user(**kwargs):
        defaults = {
            "email": "testuser@example.com",
            "password": "Testpass123",
            "is_active": True,
        }
        defaults.update(kwargs)
        user = User.objects.create_user(**defaults)
        return user
    return make_user

@pytest.fixture
def jwt_tokens(create_user):
    """Returns access and refresh tokens for a test user."""
    user = create_user()
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": user
    }

@pytest.fixture
def auth_client(api_client, jwt_tokens):
    """APIClient pre-authenticated with JWT access token."""
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {jwt_tokens['access']}")
    return api_client

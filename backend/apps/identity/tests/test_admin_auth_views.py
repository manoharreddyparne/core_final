# users/tests/test_admin_auth_views.py
import pytest
import json
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from django.core.cache import cache

from apps.identity.models import User, RememberedDevice
from apps.identity.services import token_service

# -------------------------------
# Helper to POST JSON with headers correctly
# -------------------------------
def post_json(client, url, payload=None, headers=None):
    headers = headers or {}
    drf_headers = {f"HTTP_{k.upper()}": v for k, v in headers.items()}
    payload = payload or {}
    # Ensure email is included if username exists
    if "username" in payload and "email" not in payload:
        payload["email"] = User.objects.filter(username=payload["username"]).first().email
    return client.post(url, data=payload, format='json', **drf_headers)

def debug_request(client, url, payload=None, headers=None):
    response = post_json(client, url, payload, headers)
    if response.status_code not in (200, 201):
        print("\n===== DEBUG INFO =====")
        print(f"URL: {url}")
        print(f"Method: POST")
        print(f"Headers: {headers}")
        print(f"POST data: {payload}")
        try:
            print("JSON Response:", json.dumps(response.json(), indent=2))
        except Exception:
            print("Raw Content:", response.content)
        print("======================\n")
    return response

def safe_request(client, url, payload=None, headers=None):
    """Raise on 500 errors, otherwise return response."""
    response = debug_request(client, url, payload, headers)
    if response.status_code >= 500:
        raise Exception(f"500 Internal Server Error: {response.content}")
    return response

# -------------------------------
# URLs
# -------------------------------
LOGIN_URL = reverse("users:admin_login")
VERIFY_OTP_URL = reverse("users:admin_verify_otp")

# -------------------------------
# Fixtures
# -------------------------------
@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="StrongPass123!",
        role=User.Roles.ADMIN
    )

@pytest.fixture
def teacher_user(db):
    return User.objects.create_user(
        username="teacher",
        email="teacher@example.com",
        password="TeacherPass123!",
        role=User.Roles.TEACHER
    )

# -------------------------------
# Trusted device helper
# -------------------------------
def create_trusted_device(user, ip="127.0.0.1", user_agent="pytest-agent"):
    device_hash = token_service.get_device_hash(ip, user_agent)
    return RememberedDevice.objects.create(
        user=user,
        device_hash=device_hash,
        trusted=True,
        last_used=timezone.now(),
        ip_address=ip,
        user_agent=user_agent
    )

# -------------------------------
# Admin login tests
# -------------------------------
@pytest.mark.django_db
def test_admin_login_requires_otp(api_client, admin_user):
    cache.clear()
    payload = {"username": admin_user.username, "email":admin_user.email,"password": "StrongPass123!"}
    response = safe_request(api_client, LOGIN_URL, payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json().get("data", {})
    assert data.get("require_otp") is True
    assert "user_id" in data

@pytest.mark.django_db
def test_admin_login_trusted_device(api_client, admin_user):
    cache.clear()

    # 1️⃣ Create trusted device
    device = create_trusted_device(admin_user)

    # 2️⃣ Generate OTP (simulate sending)
    otp_code = token_service.generate_test_otp(admin_user)

    # 3️⃣ Send OTP verification request
    payload = {
        "user_id": admin_user.id,
        "otp": otp_code,
        "password": "StrongPass123!"
    }
    headers = {"REMOTE_ADDR": device.ip_address, "USER_AGENT": device.user_agent}
    response = safe_request(api_client, VERIFY_OTP_URL, payload, headers)

    data = response.json().get("data", {})
    assert "access" in data and "refresh" in data

@pytest.mark.django_db
def test_admin_login_with_trusted_device(api_client, admin_user):
    cache.clear()
    device = create_trusted_device(admin_user)
    payload = {"username": admin_user.username, "email":admin_user.email, "password": "StrongPass123!"}
    # Use the same IP/user-agent as the trusted device
    headers = {"REMOTE_ADDR": device.ip_address, "USER_AGENT": device.user_agent}
    response = safe_request(api_client, LOGIN_URL, payload, headers)  # NOT VERIFY_OTP_URL

    assert response.status_code == status.HTTP_200_OK
    data = response.json().get("data", {})
    assert data.get("access") is not None
    assert data.get("refresh") is not None

# -------------------------------
# Admin OTP verification tests
# -------------------------------
@pytest.mark.django_db
def test_admin_verify_otp_debug(api_client, admin_user):
    cache.clear()
    otp_code = token_service.generate_test_otp(admin_user)
    payload = {"user_id": admin_user.id, "otp": otp_code, "password": "StrongPass123!"}
    response = debug_request(api_client, VERIFY_OTP_URL, payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json().get("data", {})
    assert "access" in data and "refresh" in data

# -------------------------------
# Admin OTP verification tests
# -------------------------------
@pytest.mark.django_db
def test_admin_verify_otp_success(api_client, admin_user):
    cache.clear()
    otp_code = token_service.generate_test_otp(admin_user)
    payload = {"user_id": admin_user.id, "otp": otp_code, "password": "StrongPass123!"}
    headers = {"REMOTE_ADDR": "127.0.0.1", "USER_AGENT": "pytest-agent"}  # headers required for trusted device
    response = safe_request(api_client, VERIFY_OTP_URL, payload, headers)

    data = response.json().get("data", {})
    assert response.status_code == status.HTTP_200_OK
    assert data.get("access") is not None
    assert data.get("refresh") is not None

@pytest.mark.django_db
def test_admin_verify_otp_invalid(api_client, admin_user):
    cache.clear()
    payload = {"user_id": admin_user.id, "otp": "wrong-otp", "password": "StrongPass123!"}
    response = safe_request(api_client, VERIFY_OTP_URL, payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Invalid or expired OTP" in response.json().get("detail", "")
# -------------------------------
# Rate limit tests
# -------------------------------
@pytest.mark.django_db
def test_admin_login_rate_limit_debug(api_client, admin_user):
    cache.clear()
    payload = {"username": admin_user.username, "email":admin_user.email, "password": "WrongPass123!"}
    for _ in range(6):
        response = debug_request(api_client, LOGIN_URL, payload)
    assert response.status_code in [429, 401]
    print("Rate-limit debug message:", response.json().get("detail"))

@pytest.mark.django_db
def test_admin_login_rate_limit(api_client, admin_user):
    cache.clear()  # ensure previous attempts cleared
    payload = {"username": admin_user.username, "email":admin_user.email,"password": "WrongPass123!"}
    for _ in range(6):
        response = post_json(api_client, LOGIN_URL, payload)
    assert response.status_code in [429, 401]

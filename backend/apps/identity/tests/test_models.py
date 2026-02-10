# users/tests/test_models.py
import pytest
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
import secrets

from users.utils.security import verify_token, hash_token
from users.models.core_models import (
    User,
    TeacherProfile,
    StudentProfile,
    PasswordResetRequest,
    PasswordHistory,
)
from users.models.auth_models import (
    BlacklistedAccessToken,
    LoginSession,
    RememberedDevice,
)

# -------------------------------------------------------------------
# FIXTURES
# -------------------------------------------------------------------
@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="testuser@example.com",
        username="testuser",
        password="StrongPass1!"
    )

@pytest.fixture
def teacher_user(db):
    return User.objects.create_user(
        email="teacher@example.com",
        username="teacher",
        password="StrongPass1!",
        role=User.Roles.TEACHER
    )

@pytest.fixture
def student_user(db):
    return User.objects.create_user(
        email="student@example.com",
        username="student",
        password="StrongPass1!",
        role=User.Roles.STUDENT
    )

# -------------------------------------------------------------------
# HELPER FUNCTION
# -------------------------------------------------------------------
def create_reset_request(user, raw_token=None):
    """Creates a PasswordResetRequest with a simulated raw token for testing."""
    if raw_token is None:
        raw_token = secrets.token_urlsafe(16)  # unique random token
    req = PasswordResetRequest.objects.create(user=user)
    req.token_hash = hash_token(raw_token)
    req.save()
    return req, raw_token

# -------------------------------------------------------------------
# USER MODEL
# -------------------------------------------------------------------
def test_user_str(user):
    assert str(user) == f"{user.username} ({user.role})"

# -------------------------------------------------------------------
# TEACHER PROFILE
# -------------------------------------------------------------------
def test_teacher_profile_creation(teacher_user):
    profile = TeacherProfile.objects.create(user=teacher_user, department="Math")
    assert "Teacher" in str(profile)

# -------------------------------------------------------------------
# STUDENT PROFILE
# -------------------------------------------------------------------
def test_student_profile_creation(student_user):
    profile = StudentProfile.objects.create(
        user=student_user,
        roll_number="2025CS001",
        admission_year="2025",
        batch="CSE"
    )
    assert "2025CS001" in str(profile)

# -------------------------------------------------------------------
# PASSWORD RESET REQUEST
# -------------------------------------------------------------------
def test_password_reset_request_creation(user):
    reset_request, raw_token = create_reset_request(user)
    assert verify_token(raw_token, reset_request.token_hash)
    assert not reset_request.is_expired()

def test_password_reset_request_expiry(user):
    req, _ = create_reset_request(user)
    req.created_at = timezone.now() - timedelta(hours=25)
    req.save()
    assert req.is_expired()

def test_password_reset_request_mark_used(user):
    req, _ = create_reset_request(user)
    req.mark_used()
    assert req.used is True
    assert req.is_expired() is True

def test_password_reset_request_invalidated_by_new_request(user):
    old_req, _ = create_reset_request(user)
    new_req, _ = create_reset_request(user)  # auto unique token
    assert old_req.is_expired() is True
    assert not new_req.is_expired()

# -------------------------------------------------------------------
# PASSWORD HISTORY
# -------------------------------------------------------------------
def test_password_history_prunes(user):
    for i in range(7):
        PasswordHistory.objects.create(user=user, password_hash=f"hash{i}")
    count = PasswordHistory.objects.filter(user=user).count()
    assert count <= PasswordHistory.MAX_HISTORY

def test_password_history_uniqueness(user):
    PasswordHistory.objects.create(user=user, password_hash="duplicate_hash")
    with pytest.raises(IntegrityError):
        PasswordHistory.objects.create(user=user, password_hash="duplicate_hash")

# -------------------------------------------------------------------
# BLACKLISTED ACCESS TOKEN
# -------------------------------------------------------------------
def test_blacklist_access_token(user):
    token = "sometoken"
    obj = BlacklistedAccessToken.blacklist(token, user)
    assert BlacklistedAccessToken.is_blacklisted(token, user)
    assert "Token" in str(obj)
    assert verify_token(token, obj.token_hash)

def test_blacklist_token_duplicate(user):
    token = "sometoken"
    obj1 = BlacklistedAccessToken.blacklist(token, user)
    obj2 = BlacklistedAccessToken.blacklist(token, user)
    assert obj1.pk == obj2.pk  # should not create duplicate

def test_blacklist_token_user_scoping(user, teacher_user):
    token = "sharedtoken"
    BlacklistedAccessToken.blacklist(token, user)
    assert BlacklistedAccessToken.is_blacklisted(token, user)
    assert not BlacklistedAccessToken.is_blacklisted(token, teacher_user)

# -------------------------------------------------------------------
# LOGIN SESSION
# -------------------------------------------------------------------
def test_login_session_creation(user):
    token_str = "sometoken"
    session = LoginSession.create_session(
        user=user,
        jti="abc123",
        token_str=token_str,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    assert session.is_active
    assert str(session).startswith("Session")
    assert verify_token(token_str, session.token_hash)

def test_login_session_deactivate(user):
    token_str = "othertoken"
    session = LoginSession.create_session(
        user=user,
        jti="xyz789",
        token_str=token_str,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    session.deactivate()
    assert session.is_active is False
    assert verify_token(token_str, session.token_hash)

def test_login_session_logout_all(user):
    s1 = LoginSession.create_session(user=user, jti="jti1", token_str="t1", expires_at=timezone.now()+timedelta(hours=1))
    s2 = LoginSession.create_session(user=user, jti="jti2", token_str="t2", expires_at=timezone.now()+timedelta(hours=1))

    for s in LoginSession.objects.filter(user=user, is_active=True):
        s.deactivate()

    s1.refresh_from_db()
    s2.refresh_from_db()
    assert all(not s.is_active for s in [s1, s2])

# -------------------------------------------------------------------
# REMEMBERED DEVICE
# -------------------------------------------------------------------
def test_remembered_device_creation(user):
    device = RememberedDevice.objects.create(
        user=user,
        device_hash="hash123",
        trusted=True,
        ip_address="127.0.0.1",
        user_agent="pytest"
    )
    assert "Trusted" in str(device)
    assert device.trusted is True

def test_remembered_device_unique_hash(user):
    RememberedDevice.objects.create(user=user, device_hash="uniquehash")
    with pytest.raises(IntegrityError):
        RememberedDevice.objects.create(user=user, device_hash="uniquehash")

def test_remembered_device_last_used_update(user):
    device = RememberedDevice.objects.create(user=user, device_hash="hashupdate")
    old_time = device.last_used
    device.last_used = timezone.now() + timedelta(minutes=1)
    device.save()
    assert device.last_used > old_time

    r"""
(env) C:\Manohar\exam_portal>pytest users/tests/test_models.py  -v --cache-clear
============================= test session starts =============================
platform win32 -- Python 3.13.1, pytest-8.4.2, pluggy-1.6.0 -- C:\Manohar\exam_portal\env\Scripts\python.exe
cachedir: .pytest_cache
django: version: 5.2.5, settings: secure_exam.settings (from ini)
rootdir: C:\Manohar\exam_portal        
configfile: pytest.ini
plugins: cov-7.0.0, django-4.11.1      
collected 18 items                                                            
 

users/tests/test_models.py::test_user_str PASSED                         [  5%]
users/tests/test_models.py::test_teacher_profile_creation PASSED         [ 11%]
users/tests/test_models.py::test_student_profile_creation PASSED         [ 16%]
users/tests/test_models.py::test_password_reset_request_creation PASSED  [ 22%]
users/tests/test_models.py::test_password_reset_request_expiry PASSED    [ 27%]
users/tests/test_models.py::test_password_reset_request_mark_used PASSED [ 33%]
users/tests/test_models.py::test_password_reset_request_invalidated_by_new_request PASSED [ 38%]
users/tests/test_models.py::test_password_history_prunes PASSED          [ 44%]
users/tests/test_models.py::test_password_history_uniqueness PASSED      [ 50%]
users/tests/test_models.py::test_blacklist_access_token PASSED           [ 55%]
users/tests/test_models.py::test_blacklist_token_duplicate PASSED        [ 61%]
users/tests/test_models.py::test_blacklist_token_user_scoping PASSED     [ 66%]
users/tests/test_models.py::test_login_session_creation PASSED           [ 72%]
users/tests/test_models.py::test_login_session_deactivate PASSED         [ 77%]
users/tests/test_models.py::test_login_session_logout_all PASSED         [ 83%]
users/tests/test_models.py::test_remembered_device_creation PASSED       [ 88%]
users/tests/test_models.py::test_remembered_device_unique_hash PASSED    [ 94%]
users/tests/test_models.py::test_remembered_device_last_used_update PASSED [100%]

============================= 18 passed in 0.76s ==============================

(env) C:\Manohar\exam_portal>"""
# users/tests/test_utils.py
import pytest
from unittest import mock
from django.core.cache import cache
from django.contrib.auth.hashers import check_password
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.utils import email_utils, general_utils, security
from apps.identity.models import User, PasswordHistory, BlacklistedAccessToken, PasswordResetRequest

@pytest.fixture
def create_user(db):
    def _make_user(**kwargs):
        return User.objects.create_user(
            username=kwargs.get("username", "testuser"),
            email=kwargs.get("email", "testuser@example.com"),
            password=kwargs.get("password", "Password123"),
        )
    return _make_user

def test_hash_token_produces_string(create_user):
    token = "sample_token"
    hashed = security.hash_token(token)
    assert isinstance(hashed, str)
    assert hashed != token
    assert security.verify_token(token, hashed) is True
    assert security.verify_token("wrong_token", hashed) is False

def test_generate_random_password_length():
    pwd = general_utils.generate_random_password(12)
    assert len(pwd) == 12

@pytest.mark.parametrize("pwd,expected", [
    ("Abcdef1@", True),
    ("abcdef1@", False),
    ("ABCDEF1@", False),
    ("Abcdefgh", False),
    ("Abc1@", False),
])
def test_validate_password_strength(pwd, expected):
    result, _ = general_utils.validate_password_strength(pwd)
    assert result is expected

def test_check_password_reuse(create_user, db):
    user = create_user()
    pwd = "Password1!"
    general_utils.log_password_history(user, pwd)
    assert general_utils.check_password_reuse(user, pwd) is True
    assert general_utils.check_password_reuse(user, "Another1@") is False

def test_log_password_history(create_user, db):
    user = create_user()
    pwd = "Password1!"
    general_utils.log_password_history(user, pwd)
    hist = PasswordHistory.objects.filter(user=user).last()
    assert hist is not None
    assert check_password(pwd, hist.password_hash)

@pytest.mark.django_db
def test_blacklist_access_token(create_user):
    user = create_user()
    token_str = "sometoken"
    general_utils.blacklist_access_token(token_str, user)
    token_obj = BlacklistedAccessToken.objects.filter(user=user).first()
    assert token_obj is not None
    assert token_obj.token_hash is not None

@pytest.mark.django_db
def test_blacklist_user_tokens_skips(create_user):
    user = create_user()
    token_obj = RefreshToken.for_user(user)
    general_utils.blacklist_user_tokens(user, skip_tokens=[str(token_obj)])

@pytest.mark.django_db
def test_blacklist_user_tokens_handles_exception(create_user):
    user = create_user()
    with mock.patch(
        "users.utils.general_utils.BlacklistedAccessToken.objects.get_or_create"
    ) as mock_get:
        mock_get.side_effect = Exception("DB failure")
        general_utils.blacklist_user_tokens(user)

@pytest.mark.django_db
@mock.patch("users.utils.email_utils.send_noreply_email", return_value=True)
def test_send_welcome_email(mock_send, create_user):
    user = create_user()
    email_utils.send_welcome_email(user, "TempPass1!")
    mock_send.assert_called_once()

@pytest.mark.django_db
def test_send_password_reset_email_success(create_user):
    user = create_user()
    from apps.identity.utils.email_utils import create_reset_request, send_password_reset_email

    reset_request, raw_token = create_reset_request(user)

    with mock.patch("users.utils.email_utils.send_noreply_email", return_value=True) as mock_send:
        success, msg = send_password_reset_email(reset_request, raw_token)
        assert success is True
        assert "Password reset link sent successfully" in msg
        mock_send.assert_called_once()

@pytest.mark.django_db
def test_send_password_reset_email_failure(create_user):
    user = create_user()
    from apps.identity.utils.email_utils import create_reset_request, send_password_reset_email

    reset_request, raw_token = create_reset_request(user)

    with mock.patch("users.utils.email_utils.send_noreply_email", return_value=False):
        success, msg = send_password_reset_email(reset_request, raw_token)
        assert success is False
        assert "Failed to send password reset email" in msg
        assert not PasswordResetRequest.objects.filter(user=user).exists()

@pytest.mark.django_db
@mock.patch("users.utils.email_utils.send_noreply_email", return_value=True)
def test_send_password_changed_email(mock_send, create_user):
    user = create_user()
    email_utils.send_password_changed_email(user)
    mock_send.assert_called_once()

@pytest.mark.django_db
@mock.patch("users.utils.email_utils.send_noreply_email", return_value=True)
def test_send_otp_to_user_and_verify(mock_send, create_user):
    user = create_user()
    otp = email_utils.send_otp_to_user(user)
    assert len(otp) == 6
    assert email_utils.verify_otp(user, otp) is True
    assert email_utils.verify_otp(user, otp) is False

@pytest.mark.django_db
def test_verify_invalid_otp(create_user):
    user = create_user()
    cache.set(f"otp:{user.id}", "123456", timeout=5)
    assert email_utils.verify_otp(user, "654321") is False
    assert email_utils.verify_otp(user, "123456") is True
    assert email_utils.verify_otp(user, "123456") is False

@pytest.mark.django_db
def test_verify_token_with_invalid_hash(create_user):
    token = "sample_token"
    malformed_hash = "invalidhashformat"
    assert security.verify_token(token, malformed_hash) is False

    unknown_key_hash = "unknownkey$abcdef1234567890"
    assert security.verify_token(token, unknown_key_hash) is False

@pytest.mark.django_db
def test_blacklist_user_tokens_empty_and_no_refresh(create_user):
    user = create_user()
    with mock.patch("users.utils.general_utils.OutstandingToken.objects.filter", return_value=[]):
        general_utils.blacklist_user_tokens(user)
    with mock.patch("users.utils.general_utils.OutstandingToken.objects.filter") as mock_filter:
        general_utils.blacklist_user_tokens(user, include_refresh=False)
        mock_filter.assert_not_called()

r"""
(env) C:\Manohar\exam_portal>pytest --cache-clear -v users/tests/test_utils.py
============================= test session starts =============================
platform win32 -- Python 3.13.1, pytest-8.4.2, pluggy-1.6.0 -- C:\Manohar\exam_portal\env\Scripts\python.exe
cachedir: .pytest_cache
django: version: 5.2.5, settings: secure_exam.settings (from env)     
rootdir: C:\Manohar\exam_portal    
plugins: django-4.11.1
collected 20 items                                                    


users/tests/test_utils.py::test_hash_token_produces_string PASSED        [  5%]
users/tests/test_utils.py::test_check_password_reuse PASSED           
   [ 10%]
users/tests/test_utils.py::test_log_password_history PASSED           
   [ 15%]
users/tests/test_utils.py::test_blacklist_access_token PASSED         
   [ 20%]
users/tests/test_utils.py::test_blacklist_user_tokens_skips PASSED       [ 25%]
users/tests/test_utils.py::test_blacklist_user_tokens_handles_exception PASSED [ 30%]
users/tests/test_utils.py::test_send_welcome_email PASSED             
   [ 35%]
users/tests/test_utils.py::test_send_password_reset_email_success PASSED [ 40%]
users/tests/test_utils.py::test_send_password_reset_email_failure PASSED [ 45%]
users/tests/test_utils.py::test_send_password_changed_email PASSED       [ 50%]
users/tests/test_utils.py::test_send_otp_to_user_and_verify PASSED       [ 55%]
users/tests/test_utils.py::test_verify_invalid_otp PASSED             
   [ 60%]
users/tests/test_utils.py::test_verify_token_with_invalid_hash PASSED    [ 65%]
users/tests/test_utils.py::test_blacklist_user_tokens_empty_and_no_refresh PASSED [ 70%]
users/tests/test_utils.py::test_generate_random_password_length PASSED   [ 75%]
users/tests/test_utils.py::test_validate_password_strength[Abcdef1@-True] PASSED [ 80%]
users/tests/test_utils.py::test_validate_password_strength[abcdef1@-False] PASSED [ 85%]
users/tests/test_utils.py::test_validate_password_strength[ABCDEF1@-False] PASSED [ 90%]
users/tests/test_utils.py::test_validate_password_strength[Abcdefgh-False] PASSED [ 95%]
users/tests/test_utils.py::test_validate_password_strength[Abc1@-False] PASSED [100%]

============================= 20 passed in 33.73s =============================

(env) C:\Manohar\exam_portal>      """

# users/tests/test_serializers.py
import pytest
import hashlib
import uuid
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.exceptions import ValidationError, AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from users.serializers import auth_serializers, password_serializers, user_serializers
from users.models import PasswordResetRequest

User = get_user_model()

# -------------------------------
# Helper
# -------------------------------
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# -------------------------------
# Fixtures
# -------------------------------
@pytest.fixture
def create_user(db):
    """Factory fixture to create users with properly hashed passwords."""
    def _make_user(**kwargs):
        password = kwargs.pop("password", "Password123")
        user = User.objects.create_user(
            username=kwargs.get("username", f"user_{uuid.uuid4().hex[:6]}"),
            email=kwargs.get("email", f"user_{uuid.uuid4().hex[:6]}@example.com"),
        )
        user.set_password(password)  # <--- critical fix
        user.save()
        return user
    return _make_user


@pytest.fixture
def mock_request():
    """Mock request object with empty META"""
    return mock.Mock(META={})

# ======================================
# Auth Serializers Tests
# ======================================
class TestAuthSerializers:
    @mock.patch("users.serializers.auth_serializers.cache")
    def test_token_obtain_pair_success(self, mock_cache, create_user, mock_request):
        user = create_user(username="alice", email="alice@example.com", password="Pass1234")
        data = {"email": "alice@example.com", "password": "Pass1234"}

        # Ensure login attempts=0 and cooldown=None
        mock_cache.get.side_effect = lambda key, default=None: "0" if "login_attempts" in key else None

        serializer = auth_serializers.CustomTokenObtainPairSerializer(
            data=data, context={"request": mock_request}
        )
        result = serializer.validate(data)
        assert result["id"] == user.id
        assert result["email"] == user.email
        assert "access" in result and "refresh" in result
    @mock.patch("users.serializers.auth_serializers.cache")
    def test_token_obtain_pair_failed_attempts(self, mock_cache, mock_request, db):
        """
        Ensure login fails for non-existent users and DB access is allowed.
        """
        data = {"email": "nonuser@example.com", "password": "wrongpass"}
        serializer = auth_serializers.CustomTokenObtainPairSerializer(
            data=data, context={"request": mock_request}
        )
        # simulate no previous failed attempts
        mock_cache.get.side_effect = lambda key, default=None: "0" if "login_attempts" in key else None
        with pytest.raises(AuthenticationFailed):
            serializer.validate(data)

    @mock.patch("users.serializers.auth_serializers.cache")
    def test_login_cooldown_enforced(self, mock_cache, create_user, mock_request):
        user = create_user(username="cooldownuser", email="cool@example.com", password="Pass1234")
        data = {"email": "cool@example.com", "password": "Pass1234"}
        mock_cache.get.side_effect = lambda key, default=None: True if "cooldown" in key else "0"
        serializer = auth_serializers.CustomTokenObtainPairSerializer(
            data=data, context={"request": mock_request}
        )
        with pytest.raises(AuthenticationFailed, match="Please wait a few seconds before retrying login."):
            serializer.validate(data)

    @pytest.mark.django_db
    def test_safe_token_verify_blacklisted(self, create_user):
        user = create_user(username="bob", password="Pass1234")
        token = RefreshToken.for_user(user)
        with mock.patch("users.serializers.auth_serializers.BlacklistedAccessToken.is_blacklisted", return_value=True):
            serializer = auth_serializers.SafeTokenVerifySerializer(data={"token": str(token)})
            with pytest.raises(AuthenticationFailed):
                serializer.is_valid(raise_exception=True)

# ======================================
# Password Serializers Tests
# ======================================
@pytest.mark.django_db
class TestPasswordSerializers:

    def test_change_password_validation(self):
        serializer = password_serializers.ChangePasswordSerializer(data={"new_password": "123"})
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_change_password_complexity(self):
        # Must contain upper, lower, number, symbol
        invalid_password = "password"  # no upper, no number, no symbol
        serializer = password_serializers.ChangePasswordSerializer(data={"new_password": invalid_password})
        import re
        def complexity_check(pw):
            if not re.search(r"[A-Z]", pw): return False
            if not re.search(r"[a-z]", pw): return False
            if not re.search(r"\d", pw): return False
            if not re.search(r"[^\w]", pw): return False
            return True
        if not complexity_check(invalid_password):
            with pytest.raises(ValidationError):
                serializer.is_valid(raise_exception=True)

    def test_reset_password_request_nonexistent_email(self):
        serializer = password_serializers.ResetPasswordRequestSerializer(data={"email": "notfound@example.com"})
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_reset_password_confirm_invalid_token(self):
        serializer = password_serializers.ResetPasswordConfirmSerializer(
            data={"token": "invalidtoken", "new_password": "Password123!"}
        )
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_reset_password_confirm_valid_token(self, create_user):
        # create raw token
        token_raw = "sometoken"
        user = create_user(username="carol", password="Pass1234")

        # create PasswordResetRequest using the correct method
        from users.utils.email_utils import create_reset_request
        reset_request, raw_token = create_reset_request(user, raw_token=token_raw)

        # serializer expects raw token
        serializer = password_serializers.ResetPasswordConfirmSerializer(
            data={"token": raw_token, "new_password": "Password123!"}
        )

        # assert it validates correctly
        assert serializer.is_valid(raise_exception=True)

# ======================================
# User Serializers Tests
# ======================================
@pytest.mark.django_db
class TestUserSerializers:

    def test_create_student_valid(self):
        data = {"roll_number": f"R{uuid.uuid4().hex[:4]}", "email": f"student_{uuid.uuid4().hex[:6]}@example.com"}
        serializer = user_serializers.CreateStudentSerializer(data=data)
        assert serializer.is_valid()

    def test_create_student_duplicate_email_case_insensitive(self, create_user):
        email = "StudentCase@example.com"
        create_user(email=email, username=f"user_{uuid.uuid4().hex[:6]}")
        data = {"roll_number": f"R{uuid.uuid4().hex[:4]}", "email": email.upper()}
        serializer = user_serializers.CreateStudentSerializer(data=data)
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_create_student_duplicate_roll_number_normalized(self, create_user):
        roll_number = "R1234"
        create_user(username=roll_number, email=f"user_{uuid.uuid4().hex[:6]}@example.com")
        data = {"roll_number": roll_number.lower(), "email": f"student_{uuid.uuid4().hex[:6]}@example.com"}
        serializer = user_serializers.CreateStudentSerializer(data=data)
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)

    def test_create_teacher_valid(self):
        data = {"email": f"teacher_{uuid.uuid4().hex[:6]}@example.com", "department": "Math"}
        serializer = user_serializers.CreateTeacherSerializer(data=data)
        assert serializer.is_valid()

    def test_create_teacher_duplicate_email_case_insensitive(self, create_user):
        email = "teacherCASE@example.com"
        create_user(email=email, username=f"user_{uuid.uuid4().hex[:6]}")
        data = {"email": email.upper(), "department": "CS"}
        serializer = user_serializers.CreateTeacherSerializer(data=data)
        with pytest.raises(ValidationError):
            serializer.is_valid(raise_exception=True)
r"""
(env) C:\Manohar\exam_portal>pytest -v users/tests/test_serializers.py --cache-clear
============================= test session starts =============================
platform win32 -- Python 3.13.1, pytest-8.4.2, pluggy-1.6.0 -- C:\Manohar\exam_portal\env\Scripts\python.exe
cachedir: .pytest_cache
django: version: 5.2.5, settings: secure_exam.settings (from env)     
rootdir: C:\Manohar\exam_portal    
plugins: django-4.11.1
collected 14 items                                                    


users/tests/test_serializers.py::TestAuthSerializers::test_token_obtain_pair_success PASSED [  7%]
users/tests/test_serializers.py::TestAuthSerializers::test_token_obtain_pair_failed_attempts PASSED [ 14%]
users/tests/test_serializers.py::TestAuthSerializers::test_login_cooldown_enforced PASSED [ 21%]
users/tests/test_serializers.py::TestAuthSerializers::test_safe_token_verify_blacklisted PASSED [ 28%]
users/tests/test_serializers.py::TestPasswordSerializers::test_change_password_validation PASSED [ 35%]  
users/tests/test_serializers.py::TestPasswordSerializers::test_change_password_complexity PASSED [ 42%]  
users/tests/test_serializers.py::TestPasswordSerializers::test_reset_password_request_nonexistent_emailPPASSED [ 50%]
users/tests/test_serializers.py::TestPasswordSerializers::test_reset_password_confirm_invalid_token PASSED [ 57%]
users/tests/test_serializers.py::TestPasswordSerializers::test_reset_password_confirm_valid_token PASSED [ 64%]
users/tests/test_serializers.py::TestUserSerializers::test_create_student_valid PASSED [ 71%]
users/tests/test_serializers.py::TestUserSerializers::test_create_student_duplicate_email_case_insensitive PASSED [ 78%]
users/tests/test_serializers.py::TestUserSerializers::test_create_student_duplicate_roll_number_normalized PASSED [ 85%]
users/tests/test_serializers.py::TestUserSerializers::test_create_teacher_valid PASSED [ 92%]
users/tests/test_serializers.py::TestUserSerializers::test_create_teacher_duplicate_email_case_insensitive PASSED [100%]

============================= 14 passed in 21.65s =============================

(env) C:\Manohar\exam_portal>      """
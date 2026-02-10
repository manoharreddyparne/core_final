# users/tests/test_services.py
import pytest
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models import User, LoginSession, BlacklistedAccessToken, PasswordResetRequest
from apps.identity.services.token_service import (
    create_login_session_safe,
    logout_all_sessions_secure,
    send_otp_to_user_secure,
    verify_otp_secure,
    blacklist_access_token,
    blacklist_user_tokens,
)
from apps.identity.services.password_service import (
    validate_password_strength,
    check_password_reuse,
    change_user_password,
)
from apps.identity.services.reset_service import (
    create_reset_request,
    confirm_reset_password,
)
from apps.identity.utils.security import verify_token


@pytest.mark.django_db
class TestTokenService(TestCase):

    def test_create_login_session_safe_and_logout(self):
        user = User.objects.create_user(
            username="sessionuser",
            email="session@example.com",
            password="Initial1!"
        )
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        session = create_login_session_safe(user, access_token, refresh_token)
        assert isinstance(session, LoginSession)
        assert session.user == user
        assert session.is_active
        assert session.token_hash is not None

        logout_all_sessions_secure(user)
        session.refresh_from_db()
        assert not session.is_active

    def test_blacklist_access_token(self):
        user = User.objects.create_user(
            username="blacklistuser",
            email="blacklist@example.com",
            password="Initial1!"
        )
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)

        blacklist_access_token(access_token, user)
        assert BlacklistedAccessToken.objects.filter(user=user).exists()

        blacklist_user_tokens(user)
        assert True  # just ensure no exceptions

    def test_send_and_verify_otp(self):
        user = User.objects.create_user(
            username="otpuser",
            email="otp@example.com",
            password="Initial1!"
        )
        otp = send_otp_to_user_secure(user)
        assert len(otp) == 6
        assert verify_otp_secure(user, otp) is True
        assert verify_otp_secure(user, otp) is False


@pytest.mark.django_db
class TestPasswordService(TestCase):

    def test_validate_password_strength(self):
        valid_pass = "Strong1!"
        invalid_pass = "weak"

        ok, _ = validate_password_strength(valid_pass)
        assert ok

        ok, reason = validate_password_strength(invalid_pass)
        assert not ok
        assert any(word in reason for word in [
            "at least", "at most", "uppercase", "lowercase", "digit", "special"
        ])

    def test_check_password_reuse_and_change(self):
        user = User.objects.create_user(
            username="passuser",
            email="pass@example.com",
            password="Initial1!"
        )
        new_password = "NewPass1!"
        assert check_password_reuse(user, "Pass0A!", history_limit=5) is False
        change_user_password(user, new_password)
        assert check_password_reuse(user, new_password) is True

    def test_password_reuse_limit(self):
        user = User.objects.create_user(
            username="historyuser",
            email="history@example.com",
            password="Initial1!"
        )
        for i in range(5):
            pwd = f"Pass{i}A!"
            change_user_password(user, pwd)
        assert check_password_reuse(user, "Pass0A!", history_limit=5) is False


@pytest.mark.django_db
class TestResetService(TestCase):

    def test_create_and_confirm_reset(self):
        user = User.objects.create_user(
            username="resetuser",
            email="reset@example.com",
            password="Initial1!"
        )
        reset_request, raw_token = create_reset_request(user)
        assert isinstance(reset_request, PasswordResetRequest)
        assert raw_token is not None
        assert verify_token(raw_token, reset_request.token_hash)

        new_password = "ResetPass1!"
        updated_user = confirm_reset_password(raw_token, new_password)
        assert updated_user
        assert updated_user.check_password(new_password)
        reset_request.refresh_from_db()
        assert reset_request.used is True

    def test_reset_with_invalid_token(self):
        from apps.identity.services.reset_service import confirm_reset_password as reset_func
        with pytest.raises(ValueError):
            reset_func("invalidtoken", "AnyPass1!")

    def test_reset_with_reused_password(self):
        user = User.objects.create_user(
            username="reuseuser",
            email="reuse@example.com",
            password="Initial1!"
        )
        reset_request, raw_token = create_reset_request(user)
        change_user_password(user, "ReusePass1!")
        from apps.identity.services.reset_service import confirm_reset_password as reset_func
        with pytest.raises(ValueError):
            reset_func(raw_token, "ReusePass1!")  # same as previous

    def test_reset_blacklists_previous_tokens(self):
        user = User.objects.create_user(
            username="blacklistreset",
            email="blacklistreset@example.com",
            password="Initial1!"
        )
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        create_login_session_safe(user, access_token, str(refresh))

        reset_request, raw_token = create_reset_request(user)
        confirm_reset_password(raw_token, "NewReset1!")

        # All previous sessions should be logged out
        assert LoginSession.objects.filter(user=user, is_active=True).count() == 0

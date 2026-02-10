# users/tests/test_authentication_utils.py
import pytest
from rest_framework.test import APIRequestFactory
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.utils.functional import SimpleLazyObject

from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.middleware import AccessTokenBlacklistMiddleware
from apps.identity.models.core_models import User
from apps.identity.models.auth_models import BlacklistedAccessToken

factory = APIRequestFactory()


@pytest.mark.django_db
class TestSafeJWTAuthentication:
    def setup_method(self):
        self.user = User.objects.create_user(
            username="authuser2",
            email="authutils@example.com",
            password="securepass123",
            is_active=True
        )
        self.auth = SafeJWTAuthentication()
    # --- helper to create a blacklisted token ---
    def blacklist_token(self, token):
        from apps.identity.services.token_service import get_token_hash
        return BlacklistedAccessToken.objects.create(
            user=self.user,
            token_hash=get_token_hash(token)
        )
    def test_authenticate_success(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        # Ensure login session exists for the token
        from apps.identity.services.token_service import create_login_session_safe
        create_login_session_safe(self.user, token)

        request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        user, _ = self.auth.authenticate(request)
        assert user == self.user

    def test_authenticate_blacklisted_token(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        self.blacklist_token(token)
        request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        with pytest.raises(AuthenticationFailed):
            self.auth.authenticate(request)

        request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        with pytest.raises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_authenticate_inactive_session(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        from apps.identity.services.token_service import get_token_hash
        # FIXED: include user
        BlacklistedAccessToken.objects.create(
            user=self.user,
            token_hash=get_token_hash(token)
        )

        request = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        with pytest.raises(AuthenticationFailed):
            self.auth.authenticate(request)

    def test_authenticate_no_token(self):
        request = factory.get("/")
        assert self.auth.authenticate(request) is None

    def test_authenticate_malformed_header(self):
        request = factory.get("/", HTTP_AUTHORIZATION="NotBearer faketoken")
        assert self.auth.authenticate(request) is None


@pytest.mark.django_db
class TestAccessTokenBlacklistMiddleware:
    def setup_method(self):
        self.user = User.objects.create_user(
            username="middlewareuser",
            email="middleware@example.com",
            password="securepass123"
        )

    def test_middleware_valid_token(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        from apps.identity.services.token_service import create_login_session_safe
        create_login_session_safe(self.user, token)

        middleware = AccessTokenBlacklistMiddleware(lambda req: req)
        req = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        result = middleware(req)

        actual_user = result.user
        assert isinstance(actual_user, SimpleLazyObject)
        assert actual_user._setupfunc() == self.user

    def test_middleware_invalid_token_raises(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        from apps.identity.services.token_service import get_token_hash
        # FIXED: include user
        BlacklistedAccessToken.objects.create(
            user=self.user,
            token_hash=get_token_hash(token)
        )

        middleware = AccessTokenBlacklistMiddleware(lambda req: req)
        req = factory.get("/", HTTP_AUTHORIZATION=f"Bearer {token}")
        result = middleware(req)

        actual_user = result.user
        assert isinstance(actual_user, SimpleLazyObject)
        # Since token is blacklisted, user should not authenticate
        assert actual_user._setupfunc() is None

    def test_middleware_no_token_sets_none(self):
        middleware = AccessTokenBlacklistMiddleware(lambda req: req)
        req = factory.get("/")
        result = middleware(req)

        actual_user = result.user
        assert isinstance(actual_user, SimpleLazyObject)
        assert actual_user._setupfunc() is None

"""
(env) C:\Manohar\exam_portal>pytest -v users/tests/test_authentication_utils.py --cache-clear
============================= test session starts =============================
platform win32 -- Python 3.13.1, pytest-8.4.2, pluggy-1.6.0 -- C:\Manohar\exam_portal\env\Scripts\python.exe
cachedir: .pytest_cache
django: version: 5.2.5, settings: secure_exam.settings (from env)     
rootdir: C:\Manohar\exam_portal    
plugins: django-4.11.1
collected 8 items                                                     


users/tests/test_authentication_utils.py::TestSafeJWTAuthentication::test_authenticate_success PASSED [ 12%]
users/tests/test_authentication_utils.py::TestSafeJWTAuthentication::test_authenticate_blacklisted_token PASSED [ 25%]
users/tests/test_authentication_utils.py::TestSafeJWTAuthentication::test_authenticate_inactive_sessionPP
 PASSED [ 37%]
users/tests/test_authentication_utils.py::TestSafeJWTAuthentication::test_authenticate_no_token PASSED [ 50%]
users/tests/test_authentication_utils.py::TestSafeJWTAuthentication::test_authenticate_malformed_headerPPASSED [ 62%]
users/tests/test_authentication_utils.py::TestAccessTokenBlacklistMiddleware::test_middleware_valid_token
 PASSED [ 75%]
users/tests/test_authentication_utils.py::TestAccessTokenBlacklistMiddleware::test_middleware_invalid_token_raises PASSED [ 87%]
users/tests/test_authentication_utils.py::TestAccessTokenBlacklistMiddleware::test_middleware_no_token_sets_none PASSED [100%]

============================== 8 passed in 0.12s ==============================

(env) C:\Manohar\exam_portal>"""

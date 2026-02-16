# users/serializers/auth_serializers.py

import logging
import hashlib
from django.conf import settings
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenVerifySerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from cryptography.fernet import Fernet, InvalidToken
from rest_framework import serializers
from django.db.models import Q

from apps.identity.models.core_models import User, CoreStudent
from apps.identity.models.auth_models import BlacklistedAccessToken
from apps.identity.utils import get_client_ip

logger = logging.getLogger(__name__)

# -------------------------------
# Security & Lockout Constants
# -------------------------------
LOGIN_COOLDOWN_SECONDS = getattr(settings, "AUTH_LOGIN_COOLDOWN_SECONDS", 0)
MAX_FAILED_ATTEMPTS = getattr(settings, "AUTH_MAX_FAILED_ATTEMPTS", 5)
LOCKOUT_MINUTES = getattr(settings, "AUTH_LOCKOUT_MINUTES", 5)

FERNET_KEY = getattr(settings, "FERNET_KEY", None)
fernet = Fernet(FERNET_KEY) if FERNET_KEY else None

# -------------------------------
# Cache Helpers

def get_cache_key(identifier: str, ip: str, prefix: str) -> str:
    salt = getattr(settings, "CACHE_KEY_SALT", settings.SECRET_KEY)
    raw = f"{identifier.strip().lower()}:{ip}:{salt}".encode()
    hashed = hashlib.sha256(raw).hexdigest()
    return f"{prefix}:{hashed}"

def encrypt_value(value: str) -> str:
    return fernet.encrypt(value.encode()).decode() if fernet else value

def decrypt_value(value: str) -> str:
    if not fernet:
        return value
    try:
        return fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        logger.warning("Failed to decrypt cache value. Possibly tampered or old key.")
        return None


# ----------------
class BaseRoleTokenSerializer(TokenObtainPairSerializer):
    username_field = "username"
    allowed_roles = []

    def build_user_payload(self, user: User) -> dict:
        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": getattr(user, "first_name", ""),
            "last_name": getattr(user, "last_name", ""),
            "first_time_login": getattr(user, "first_time_login", False),
            "need_password_reset": getattr(user, "need_password_reset", False),
            "role": getattr(user, "role", None),
        }

    def validate(self, attrs):
        login_input = attrs.get("username") or attrs.get("login")
        password = attrs.get("password")
        ip = get_client_ip(self.context.get("request")) if "request" in self.context else "unknown"

        if not login_input or not password:
            raise AuthenticationFailed("Login and password are required.")

        # Emails lowercased, IDs untouched
        normalized_login = login_input.lower() if "@" in login_input else login_input

        attempts_key = get_cache_key(normalized_login, ip, "login_attempts")
        cooldown_key = get_cache_key(normalized_login, ip, "cooldown")
        
        # Consistent with login view: plain integers for simple counters
        raw_attempts = cache.get(attempts_key, 0)
        try:
            failed_attempts = int(raw_attempts) if isinstance(raw_attempts, (int, float)) else 0
        except Exception:
            failed_attempts = 0

        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            raise AuthenticationFailed(f"Too many failed login attempts. Try again after {LOCKOUT_MINUTES} minutes.")
        if cache.get(cooldown_key):
            raise AuthenticationFailed("Please wait a few seconds before retrying login.")

        user = User.objects.filter(
            Q(email__iexact=normalized_login) | Q(username__exact=normalized_login)
        ).first()

        if not user:
            cache.set(attempts_key, failed_attempts + 1, LOCKOUT_MINUTES * 60)
            raise AuthenticationFailed(f"{login_input} not found.")

        if user.role not in self.allowed_roles:
            cache.set(attempts_key, failed_attempts + 1, LOCKOUT_MINUTES * 60)
            raise AuthenticationFailed(f"User not allowed to login as {self.allowed_roles}.")

        if not user.check_password(password):
            cache.set(attempts_key, failed_attempts + 1, LOCKOUT_MINUTES * 60)
            raise AuthenticationFailed("Wrong password.")

        cache.delete(attempts_key)
        cache.set(cooldown_key, True, LOGIN_COOLDOWN_SECONDS)

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        data = {"refresh": str(refresh), "access": str(access)}
        data.update(self.build_user_payload(user))
        self.user = user

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        return data
# -------------------------------
# Role-specific Serializers
# -------------------------------
class CustomTokenObtainPairSerializer(BaseRoleTokenSerializer):
    allowed_roles = [User.Roles.STUDENT]

class AdminTokenObtainPairSerializer(BaseRoleTokenSerializer):
    allowed_roles = [User.Roles.ADMIN, User.Roles.TEACHER, User.Roles.SUPER_ADMIN, User.Roles.INSTITUTION_ADMIN]

# ---------------- Token Verify
class SafeTokenVerifySerializer(TokenVerifySerializer):
    def validate(self, attrs):
        token = attrs["token"]
        data = super().validate(attrs)
        if BlacklistedAccessToken.is_blacklisted(token):
            raise AuthenticationFailed("This token has been blacklisted.")
        return data

# -------------------------------
# User Profile Serializer
# -------------------------------
class UserProfileSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    role = serializers.CharField(source="role")
    branch = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    first_time_login = serializers.BooleanField(source="first_time_login")
    need_password_reset = serializers.BooleanField(source="need_password_reset")

    class Meta:
        model = User
        fields = [
            "id", "name", "email", "username", "avatar", "role",
            "branch", "subjects", "student_id",
            "first_time_login", "need_password_reset"
        ]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_avatar(self, obj):
        if getattr(obj, "avatar_url", None):
            return obj.avatar_url
        elif getattr(obj, "avatar", None):
            return f"{settings.MEDIA_URL}{obj.avatar}"
        return None

    def get_branch(self, obj):
        return getattr(obj, "branch", None) if obj.role in [User.Roles.TEACHER, User.Roles.STUDENT] else None

    def get_subjects(self, obj):
        if obj.role == User.Roles.TEACHER and hasattr(obj, "subjects"):
            return [{"id": s.id, "name": s.name} for s in obj.subjects.all()]
        elif obj.role == User.Roles.STUDENT and hasattr(obj, "enrolled_subjects"):
            return [{"id": s.id, "name": s.name} for s in obj.enrolled_subjects.all()]
        return []

    def get_student_id(self, obj):
        return getattr(obj, "student_id", None) if obj.role == User.Roles.STUDENT else None

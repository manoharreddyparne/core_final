# users/serializers/auth_serializers.py
import logging
from django.contrib.auth.models import update_last_login
from django.core.cache import cache
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenVerifySerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings
from apps.identity.models.core_models import User
from apps.identity.models.auth_models import BlacklistedAccessToken

logger = logging.getLogger(__name__)

LOGIN_COOLDOWN_SECONDS = 10
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 5

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom serializer:
    - Login via username/email
    - Rate limiting & cooldown
    - Return extra user info
    """
    def validate(self, attrs):
        login_input = attrs.get('username') or attrs.get('email')
        password = attrs.get('password')

        if not login_input or not password:
            raise serializers.ValidationError("Both login and password are required.")

        ip = self.context['request'].META.get("REMOTE_ADDR", "")
        cache_key = f"login_attempts:{login_input}:{ip}"
        failed_attempts = cache.get(cache_key, 0)

        # Lockout
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            raise serializers.ValidationError(
                f"Too many failed login attempts. Try again after {LOCKOUT_MINUTES} minutes."
            )

        # Cooldown
        if cache.get(f"cooldown:{login_input}:{ip}"):
            raise serializers.ValidationError(
                "Please wait a few seconds before retrying login."
            )

        # Lookup user
        user_qs = User.objects.filter(username=login_input) | User.objects.filter(email__iexact=login_input)
        if not user_qs.exists():
            cache.set(cache_key, failed_attempts + 1, LOCKOUT_MINUTES * 60)
            raise serializers.ValidationError("Invalid credentials.")

        user = user_qs.first()

        if not user.check_password(password):
            cache.set(cache_key, failed_attempts + 1, LOCKOUT_MINUTES * 60)
            raise serializers.ValidationError("Invalid credentials.")

        # Reset attempts & start cooldown
        cache.delete(cache_key)
        cache.set(f"cooldown:{login_input}:{ip}", True, LOGIN_COOLDOWN_SECONDS)

        attrs['username'] = user.username
        data = super().validate(attrs)

        if api_settings.UPDATE_LAST_LOGIN:
            update_last_login(None, user)

        data.update({
            'id': user.id,
            'role': user.role,
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'avatar': getattr(user, 'avatar', None),
            'need_password_reset': getattr(user, 'need_password_reset', False),
            'first_time_login': getattr(user, 'first_time_login', False),
        })

        self.user = user
        return data


class SafeTokenVerifySerializer(TokenVerifySerializer):
    """
    Verify JWT token and ensure it's not blacklisted (hash-based)
    """
    def validate(self, attrs):
        token = attrs['token']
        data = super().validate(attrs)
        if BlacklistedAccessToken.is_blacklisted(token):
            raise InvalidToken("This token has been blacklisted.")
        return data

# users/serializers/password_serializers.py
import hashlib
import logging
import re
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.identity.models import PasswordResetRequest
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken
from apps.identity.utils.security import verify_token

logger = logging.getLogger(__name__)
User = get_user_model()

FERNET_KEY = getattr(settings, "FERNET_KEY", None)
fernet = Fernet(FERNET_KEY) if FERNET_KEY else None

# -------------------------------
# Helpers
# -------------------------------
def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def encrypt_value(value: str) -> str:
    if not fernet:
        return value
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(value: str) -> str:
    if not fernet:
        return value
    try:
        return fernet.decrypt(value.encode()).decode()
    except InvalidToken:
        logger.warning("Failed to decrypt token. Possibly tampered.")
        return None

def validate_password_complexity(password: str):
    # --- Length check ---
    if len(password) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if len(password) >=16:
        raise serializers.ValidationError("Password can't contain more than 16 characters long")
    # --- Whitespace check ---
    if " " in password:
        raise serializers.ValidationError("Password can't contain spaces.")

    # --- Check lowercase ---
    if not re.search(r"[a-z]", password):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")

    # --- Check uppercase ---
    if not re.search(r"[A-Z]", password):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")

    # --- Check digit ---
    if not re.search(r"\d", password):
        raise serializers.ValidationError("Password must contain at least one number.")

    # --- Check special character ---
    # \W matches any non-word character; _ is also often allowed as special char
    if not re.search(r"[\W_]", password):
        raise serializers.ValidationError("Password must contain at least one special character.")

    return password

# -------------------------------
# Serializers
# -------------------------------
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    new_password = serializers.CharField(write_only=True, required=True)

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)

    def validate_new_password(self, value):
        return validate_password_complexity(value)

    def validate(self, attrs):
        if not self.user:
             return attrs
             
        # Detect if password check is required (not for forced resets/first time)
        is_forced = getattr(self.user, 'first_time_login', False) or getattr(self.user, 'need_password_reset', False)
        
        if not is_forced:
            old_password = attrs.get('old_password')
            if not old_password:
                raise serializers.ValidationError({"old_password": "Old password is required."})
            if not self.user.check_password(old_password):
                raise serializers.ValidationError({"old_password": "Incorrect old password."})
        
        return attrs

    def save(self):
        new_password = self.validated_data['new_password']
        self.user.set_password(new_password)
        
        # Clear security flags if present
        if hasattr(self.user, 'first_time_login'):
            self.user.first_time_login = False
        if hasattr(self.user, 'need_password_reset'):
            self.user.need_password_reset = False
            
        self.user.save()
        return self.user

class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

# -------------------------------
# Serializer
# -------------------------------
class ResetPasswordConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_token(self, value):
        reset_requests = PasswordResetRequest.objects.filter(used=False).order_by("-created_at")
        matching_request = None

        for req in reset_requests:
            if verify_token(value, req.token_hash):
                matching_request = req
                break

        if not matching_request:
            raise serializers.ValidationError("Invalid or expired token.")

        self.user = matching_request.user
        self.reset_request = matching_request
        return value

    def validate_new_password(self, value):
        return validate_password_complexity(value)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

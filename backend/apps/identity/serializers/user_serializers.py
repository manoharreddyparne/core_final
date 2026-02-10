# ✅ FINAL — CLEAN, STABLE
# users/serializers/user_serializers.py

import logging
import hashlib
from django.contrib.auth import get_user_model
from rest_framework import serializers

from users.models import StudentProfile, TeacherProfile

logger = logging.getLogger(__name__)
User = get_user_model()

# =====================================================================
# Helpers
# =====================================================================
def hash_identifier(value: str) -> str:
    """Hash sensitive identifiers for logging."""
    try:
        return hashlib.sha256(value.encode()).hexdigest()
    except Exception:
        return "invalid"


# =====================================================================
# Base Serializers
# =====================================================================
class UserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(read_only=True)
    first_time_login = serializers.BooleanField(read_only=True)
    need_password_reset = serializers.BooleanField(read_only=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "first_time_login",
            "need_password_reset",
            "avatar",
        ]


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["user", "roll_number", "admission_year", "batch"]


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeacherProfile
        fields = ["user", "department"]


# =====================================================================
# Creation (Admin bulk + single)
# =====================================================================
class CreateStudentSerializer(serializers.Serializer):
    roll_number = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    admission_year = serializers.CharField(required=False, allow_blank=True)
    batch = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        roll_number = attrs.get("roll_number", "").strip().lower()
        email = attrs.get("email", "").strip().lower()

        # Roll number uniqueness
        if User.objects.filter(username__iexact=roll_number).exists():
            logger.warning(
                f"Duplicate roll_number attempt: {hash_identifier(roll_number)}"
            )
            raise serializers.ValidationError(
                f"Roll number '{roll_number}' is already taken."
            )

        # Email uniqueness
        if User.objects.filter(email__iexact=email).exists():
            logger.warning(f"Duplicate email attempt: {hash_identifier(email)}")
            raise serializers.ValidationError(
                f"Email '{email}' is already taken."
            )

        attrs["roll_number"] = roll_number
        attrs["email"] = email
        return attrs


class CreateTeacherSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    department = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            logger.warning(
                f"Duplicate teacher email attempt: {hash_identifier(email)}"
            )
            raise serializers.ValidationError(
                f"Email '{email}' is already taken."
            )
        return email


# =====================================================================
# Update (PATCH /profile/update)
# =====================================================================
class UserUpdateSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "avatar"]
        extra_kwargs = {
            "email": {"required": False},
            "first_name": {"required": False},
            "last_name": {"required": False},
        }


class StudentProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = ["roll_number", "admission_year", "batch"]
        extra_kwargs = {
            "roll_number": {"required": False},
            "admission_year": {"required": False},
            "batch": {"required": False},
        }


class TeacherProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = ["department"]
        extra_kwargs = {"department": {"required": False}}

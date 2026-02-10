# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import StudentProfile, TeacherProfile, BlacklistedAccessToken
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken
from . import utils

User = get_user_model()

# -------------------------------
# USER SERIALIZERS
# -------------------------------
class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name", "role",
            "avatar", "need_password_reset", "first_time_login"
        ]
        read_only_fields = ["id", "role", "avatar", "need_password_reset", "first_time_login"]

# -------------------------------
# LOGIN SERIALIZER
# -------------------------------
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

# -------------------------------
# TEACHER SERIALIZERS
# -------------------------------
class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = TeacherProfile
        fields = ["user", "department"]

# -------------------------------
# STUDENT SERIALIZERS
# -------------------------------
class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["user", "roll_number", "admission_year", "batch"]

class BulkStudentSerializer(serializers.Serializer):
    roll_number = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    admission_year = serializers.CharField(max_length=10, required=False, allow_blank=True)
    batch = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate_roll_number(self, value):
        if StudentProfile.objects.filter(roll_number=value).exists():
            raise serializers.ValidationError("Roll number already exists.")
        return value

    def create(self, validated_data):
        # Generate a random password for student
        password = utils.generate_random_password()
        user = User.objects.create_user(
            username=validated_data["roll_number"],
            email=validated_data["email"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role=User.Roles.STUDENT,
            first_time_login=True,
            need_password_reset=True
        )
        user.set_password(password)
        user.save()

        utils.log_password_history(user, password)

        StudentProfile.objects.create(
            user=user,
            roll_number=validated_data["roll_number"],
            admission_year=validated_data.get("admission_year", ""),
            batch=validated_data.get("batch", "")
        )
        return {"user": user, "password": password}

# -------------------------------
# PASSWORD MANAGEMENT SERIALIZERS
# -------------------------------
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=False, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_new_password(self, value):
        valid, msg = utils.validate_password_strength(value)
        if not valid:
            raise serializers.ValidationError(msg)
        return value

    def validate(self, attrs):
        user = self.context.get("user") or self.context["request"].user
        new_password = attrs.get("new_password")
        old_password = attrs.get("old_password")

        if not (user.first_time_login or user.need_password_reset):
            if not old_password:
                raise serializers.ValidationError({"old_password": "This field is required."})
            if not user.check_password(old_password):
                raise serializers.ValidationError({"old_password": "Old password is incorrect."})

        if utils.check_password_reuse(user, new_password):
            raise serializers.ValidationError({"new_password": "You cannot reuse an old password."})

        return attrs

    def save(self, **kwargs):
        user = self.context.get("user") or self.context["request"].user
        new_password = self.validated_data["new_password"]

        user.set_password(new_password)
        user.first_time_login = False
        user.need_password_reset = False
        user.save()

        utils.log_password_history(user, new_password)

        # Blacklist all outstanding access tokens
        for token_obj in OutstandingToken.objects.filter(user=user):
            BlacklistedAccessToken.objects.get_or_create(
                token_hash=BlacklistedAccessToken.hash_token(str(RefreshToken(token_obj.token).access_token)),
                user=user
            )

        utils.send_password_changed_email(user)
        return user

# -------------------------------
# PASSWORD RESET SERIALIZERS
# -------------------------------
class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

# -------------------------------
# PASSWORD RESET CONFIRM SERIALIZER
# -------------------------------
class ResetPasswordConfirmSerializer(serializers.Serializer):
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_new_password(self, value):
        valid, msg = utils.validate_password_strength(value)
        if not valid:
            raise serializers.ValidationError(msg)
        return value

    def save(self, user):
        """
        Save the new password and update user flags.
        Blacklisting of old JWTs and sending email will be handled in the view AFTER password reset.
        """
        new_password = self.validated_data["new_password"]

        # Check password reuse
        if utils.check_password_reuse(user, new_password):
            raise serializers.ValidationError("Cannot reuse previous passwords. Choose a new one.")

        # Set new password and update flags
        user.set_password(new_password)
        user.first_time_login = False
        user.need_password_reset = False
        user.save()

        # Log password history
        utils.log_password_history(user, new_password)

        return user

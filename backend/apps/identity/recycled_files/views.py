# users/views.py
# cSpell:disable
import logging
from datetime import timedelta

from django.contrib.auth import authenticate, login, logout, get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from users.authentication import SafeJWTAuthentication
from .models import (
    User,
    StudentProfile,
    TeacherProfile,
    PasswordHistory,
    PasswordResetRequest,
    BlacklistedAccessToken,
)
from .serializers import (
    UserSerializer,
    StudentProfileSerializer,
    TeacherProfileSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    ResetPasswordSerializer,
    ResetPasswordConfirmSerializer,
)
from .utils import (
    generate_random_password,
    send_welcome_email,
    send_password_reset_email,
    send_password_changed_email,
    check_password_reuse,
    export_students_to_csv,
    validate_password_strength,
    blacklist_user_tokens,
    blacklist_access_token,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# -------------------------------
# Helper responses
# -------------------------------
def success_response(message, data=None, status_code=status.HTTP_200_OK):
    payload = {"detail": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=status_code)


def error_response(message, status_code=status.HTTP_400_BAD_REQUEST):
    return Response({"detail": message}, status=status_code)


# -------------------------------
# AUTH VIEWS
# -------------------------------
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = LoginSerializer

    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=username, password=password)
        if not user:
            logger.warning(f"Failed login attempt for {username}")
            return error_response("Invalid credentials", status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        refresh = RefreshToken.for_user(user)
        logger.info(f"User logged in: {user.username}")

        # Multi-device login allowed: do NOT blacklist old tokens

        require_password_change = user.first_time_login or user.need_password_reset

        return success_response(
            "Login successful",
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
                "require_password_change": require_password_change,
            },
        )


# -------------------------------
# SAFE TOKEN REFRESH VIEW
# -------------------------------
class SafeTokenRefreshView(TokenRefreshView):
    """
    Overrides TokenRefreshView:
    - Blacklist old refresh token
    - Blacklist old access token from the same session
    - Issue new access + refresh tokens
    """

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        old_refresh_str = request.data.get("refresh")
        old_access_str = request.headers.get("Authorization", "").replace("Bearer ", "")

        if old_refresh_str:
            try:
                old_refresh = RefreshToken(old_refresh_str)
                user_id = old_refresh.get("user_id")
                user_obj = User.objects.filter(id=user_id).first()

                # Blacklist old refresh token
                old_refresh.blacklist()

                # Blacklist only the old access token for this session
                if user_obj and old_access_str:
                    BlacklistedAccessToken.objects.get_or_create(
                        token_hash=BlacklistedAccessToken.hash_token(old_access_str),
                        user=user_obj
                    )

            except Exception as e:
                logger.error(f"[SafeTokenRefreshView] Error blacklisting old tokens: {e}")

        return Response(serializer.validated_data, status=status.HTTP_200_OK)

# -------------------------------
# CUSTOM TOKEN REFRESH VIEW
# -------------------------------
class CustomTokenRefreshView(SafeTokenRefreshView):
    """
    Refresh the token and return friendly message + new tokens
    """
    def post(self, request, *args, **kwargs):
        response_data = super().post(request, *args, **kwargs).data
        return Response(
            {"detail": "Token refreshed successfully", "data": response_data},
            status=status.HTTP_200_OK
        )
class CustomTokenVerifyView(TokenVerifyView):
    """
    Verifies a given access or refresh token.
    Checks that the token is valid and not blacklisted.
    """
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)

            # Token is structurally valid
            token_str = request.data.get("token")

            # Optional: If you want to also check blacklisting for access tokens
            from .models import BlacklistedAccessToken
            from .authentication import SafeJWTAuthentication
            from .models import User

            # Decode token without raising errors (just to get user info)
            user, validated_token = SafeJWTAuthentication().get_validated_token(token_str), None
            # SafeJWTAuthentication().authenticate() requires request, so we just check blacklist manually
            if BlacklistedAccessToken.is_blacklisted(token_str):
                return Response({"detail": "Token has been blacklisted."}, status=401)

        except TokenError as e:
            raise InvalidToken(e.args[0])
        except Exception as e:
            return Response({"detail": f"Invalid token: {str(e)}"}, status=401)

        return Response({"detail": "Token is valid."}, status=200)

class LogoutView(APIView):
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception as e:
            logger.error(f"Logout error: {e}")

        if request.auth:
            blacklist_access_token(str(request.auth), request.user)

        logout(request)
        logger.info(f"User logged out: {request.user.username}")
        return success_response("Logged out successfully")


class LogoutAllView(APIView):
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        try:
            # Use the utility to blacklist all tokens for this user
            blacklist_user_tokens(user, include_refresh=True)
        except Exception as e:
            logger.error(f"[LogoutAllView] Error blacklisting all tokens for user {user.username}: {e}")
            return error_response("Failed to logout from all sessions", status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info(f"All tokens blacklisted for user {user.username}")
        return success_response("Logged out from all sessions successfully")


# -------------------------------
# USER MANAGEMENT
# -------------------------------
class UserViewSet(ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]


class CreateStudentView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        data = request.data
        created_students = []
        skipped_students = []

        students_list = [data] if isinstance(data, dict) else data if isinstance(data, list) else None
        if students_list is None:
            return error_response("Invalid payload. Expected a dict or list of dicts.", status.HTTP_400_BAD_REQUEST)

        for s in students_list:
            roll_number = s.get("roll_number")
            email = s.get("email")
            if User.objects.filter(username=roll_number).exists() or User.objects.filter(email=email).exists():
                skipped_students.append({"roll_number": roll_number, "email": email})
                continue
            try:
                password = generate_random_password()
                student = User.objects.create_user(
                    username=roll_number,
                    email=email,
                    password=password,
                    role=User.Roles.STUDENT,
                    first_time_login=True,
                    need_password_reset=True,
                )
                StudentProfile.objects.create(
                    user=student,
                    roll_number=roll_number,
                    admission_year=s.get("admission_year", ""),
                    batch=s.get("batch", ""),
                )
                try:
                    send_welcome_email(student, password)
                except Exception as e:
                    logger.warning(f"Failed to send welcome email to {email}: {e}")

                created_students.append({"roll_number": roll_number, "email": email, "password": password})
            except Exception as e:
                logger.error(f"Failed to create student {roll_number}: {e}")
                skipped_students.append({"roll_number": roll_number, "email": email, "reason": str(e)})

        if not created_students and skipped_students:
            return error_response(f"No students were created. Skipped: {skipped_students}", status.HTTP_400_BAD_REQUEST)

        response = export_students_to_csv(created_students)
        if skipped_students:
            response["X-Skipped-Students"] = str(skipped_students)

        logger.info(f"{len(created_students)} students created. {len(skipped_students)} skipped.")
        return response


class CreateTeacherView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        teachers_data = request.data.get("teachers", [])
        created_teachers = []

        for t in teachers_data:
            password = generate_random_password()
            teacher = User.objects.create_user(
                username=t["email"],
                email=t["email"],
                password=password,
                role=User.Roles.TEACHER,
                first_time_login=True,
                need_password_reset=True,
            )
            TeacherProfile.objects.create(user=teacher, department=t.get("department", ""))
            try:
                send_welcome_email(teacher, password)
            except Exception as e:
                logger.warning(f"Failed to send welcome email to {t['email']}: {e}")
            created_teachers.append({"email": t["email"], "department": t.get("department", ""), "password": password})

        logger.info(f"{len(created_teachers)} teachers created")
        return success_response("Teachers created successfully", created_teachers)


# -------------------------------
# PASSWORD MANAGEMENT
# -------------------------------
class ChangePasswordView(APIView):
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        new_password = serializer.validated_data["new_password"]

        old_password = serializer.validated_data.get("old_password")
        if not user.first_time_login and not user.need_password_reset:
            if not old_password or not user.check_password(old_password):
                return error_response("Old password is incorrect.", status.HTTP_400_BAD_REQUEST)
        if check_password_reuse(user, new_password):
            msg = "Cannot reuse previous passwords. Choose a new one."
            logger.warning(f"[PasswordHistory] {msg} for user: {user.email}")
            return error_response(msg, status.HTTP_400_BAD_REQUEST)
        valid, msg = validate_password_strength(new_password)
        if not valid:
            return error_response(msg)

        # Update password
        user.set_password(new_password)
        user.first_time_login = False
        user.need_password_reset = False
        user.save()
        PasswordHistory.objects.create(user=user, password_hash=user.password)

        try:
            send_password_changed_email(user)
        except Exception as e:
            logger.warning(f"Password changed email failed for {user.email}: {e}")

        # Blacklist all old tokens and issue new tokens
        blacklist_user_tokens(user, include_refresh=True)
        new_refresh = RefreshToken.for_user(user)
        new_access = new_refresh.access_token

        return success_response(
            "Password updated successfully",
            data={
                "refresh": str(new_refresh),
                "access": str(new_access),
                "user": UserSerializer(user).data,
            },
        )


# -------------------------------
# RESET PASSWORD REQUEST VIEW
# -------------------------------
class ResetPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    COOLDOWN_MINUTES = 5  # Cooldown before requesting another link

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()

        try:
            user = User.objects.get(email__iexact=email)

            # --------------------------
            # Invalidate old tokens
            # --------------------------
            old_requests = PasswordResetRequest.objects.filter(user=user, used=False)
            for old in old_requests:
                old.used = True
                old.save(update_fields=["used"])
                logger.info(f"[ResetPasswordRequest] Invalidated old reset token for {user.email}: {old.token}")

            # Create new reset request
            reset_obj = PasswordResetRequest.objects.create(user=user)

            # Send email
            success, message = send_password_reset_email(reset_obj)
            if not success:
                logger.warning(f"[ResetPasswordRequest] Failed to send email for {user.email}")
                return error_response(message, status.HTTP_500_INTERNAL_SERVER_ERROR)

            logger.info(f"[ResetPasswordRequest] Password reset email sent to {user.email}: {reset_obj.token}")
            return success_response(message)

        except User.DoesNotExist:
            logger.warning(f"[ResetPasswordRequest] Password reset requested for non-existent email: {email}")
            return error_response("User with this email does not exist", status.HTTP_404_NOT_FOUND)
# -------------------------------
# RESET PASSWORD CONFIRM VIEW
# -------------------------------
class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token: str):
        try:
            logger.info(f"[DEBUG] Received reset token: {token}")

            # Step 1: Get valid reset request
            try:
                reset_obj = PasswordResetRequest.objects.get(token=token, used=False)
            except PasswordResetRequest.DoesNotExist:
                logger.warning(f"Reset token invalid or already used: {token}")
                return error_response("Invalid or used reset token.", status.HTTP_400_BAD_REQUEST)

            user = reset_obj.user
            logger.info(f"[DEBUG] Resetting password for user: {user.email}")

            # Step 2: Check expiration (24 hours)
            if reset_obj.is_expired():
                logger.warning(f"Reset token expired for user: {user.email}")
                return error_response("Reset token has expired.", status.HTTP_400_BAD_REQUEST)

            # Step 3: Deserialize new password
            serializer = ResetPasswordConfirmSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Step 4: Save new password (password history checked inside serializer)
            try:
                serializer.save(user=user)
                logger.info(f"[DEBUG] Password updated for user: {user.email}")
            except Exception as e:
                logger.error(f"[ResetPasswordConfirmView] Error saving new password: {e}", exc_info=True)
                return error_response(f"Failed to reset password. Exception: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Step 5: Mark token as used AFTER successful password reset
            reset_obj.used = True
            reset_obj.save(update_fields=['used'])
            logger.info(f"[DEBUG] Reset token marked as used: {token}")

            # Step 6: Send password change email BEFORE blacklisting
            try:
                send_password_changed_email(user)
                logger.info(f"[DEBUG] Password change email sent to {user.email}")
            except Exception as e:
                logger.warning(f"Failed to send password changed email: {e}")

            # Step 7: Blacklist old JWTs AFTER email
            try:
                blacklist_user_tokens(user, include_refresh=True)
                logger.info(f"[DEBUG] Blacklisted old tokens for user: {user.email}")
            except Exception as e:
                logger.warning(f"Failed to blacklist old tokens: {e}")

            # Step 8: Issue new JWTs
            new_refresh = RefreshToken.for_user(user)
            new_access = new_refresh.access_token

            # Step 9: Return success response
            return success_response(
                "Password has been reset successfully",
                data={
                    "refresh": str(new_refresh),
                    "access": str(new_access),
                    "user": UserSerializer(user).data,
                },
            )

        except Exception as e:
            logger.error(f"[ResetPasswordConfirmView] Unexpected error: {e}", exc_info=True)
            return error_response(f"Unexpected error: {str(e)}", status.HTTP_500_INTERNAL_SERVER_ERROR)

# PROFILE VIEWS
# -------------------------------
class MeView(APIView):
    """
    Returns the current authenticated user's profile.
    Only works with a valid, non-blacklisted access token.
    """
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return success_response(
            "User profile retrieved successfully",
            serializer.data
        )
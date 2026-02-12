# ✅ FINAL — users/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter

# -------------------------------
# AUTH / TOKEN / LOGOUT
# -------------------------------
from apps.identity.views.auth.login import CustomTokenObtainPairView
from apps.identity.views.auth.logout import LogoutView, LogoutAllView
from apps.identity.views.auth.token import CustomTokenSecureView, CustomTokenVerifyView

# -------------------------------
# SESSION MANAGEMENT
# -------------------------------
from apps.identity.views.token_refresh import SessionBootstrapView
from apps.identity.views.device_sessions import (
    SessionListView,
    SessionLogoutView,
    SessionLogoutAllView,
    SessionValidateView,
)
from apps.identity.views.api_views import UpdateSessionLocationView
from apps.identity.views.security_views import SecureDeviceView

# -------------------------------
# USER MANAGEMENT (ADMIN)
# -------------------------------
from apps.identity.views.admin.user_admin_crud import UserAdminViewSet
from apps.identity.views.admin.student_admin_views import (
    CreateStudentView as AdminCreateStudentView,
    StudentProfileSearchView as AdminStudentSearchView,
    BulkInviteStudentsView,
)
from apps.identity.views.admin.teacher_admin_views import (
    CreateTeacherView as AdminCreateTeacherView,
    TeacherProfileSearchView as AdminTeacherSearchView,
)

# ✅ NEW — Student / Teacher Detail Views
from apps.identity.views.admin.student_detail_views import AdminStudentDetailView
from apps.identity.views.admin.teacher_detail_views import AdminTeacherDetailView
from apps.identity.views.admin.bulk_upload import BulkStudentUploadView
from apps.identity.views.admin.core_student_views import CoreStudentAdminViewSet
from apps.identity.views.admin.institution_views import InstitutionViewSet
from apps.identity.views.auth.v2_auth import (
    IdentityCheckView,
    ActivationCompleteView,
    StudentLoginView,
    FacultyLoginView,
    FacultyMFAVerifyView
)
from apps.identity.views.public.tenants import PublicInstitutionListView
from apps.identity.views.public.registration import InstitutionRegistrationView

from apps.identity.views.admin.jit_verify import VerifyAdminTicketView

# -------------------------------
# CURRENT USER
# -------------------------------
from apps.identity.views.user.me_view import MeView

# -------------------------------
# PASSWORD MANAGEMENT
# -------------------------------
from apps.identity.views.password.change import ChangePasswordView
from apps.identity.views.password.request import ResetPasswordRequestView
from apps.identity.views.password.validate import ResetPasswordValidateView
from apps.identity.views.password.confirm import ResetPasswordConfirmView

# -------------------------------
# ADMIN AUTH / 2FA
# -------------------------------
from apps.identity.views.admin_auth_views import (
    AdminTokenObtainPairView,
    AdminVerifyOTPView,
)

# -------------------------------
# SOCIAL LOGIN
# -------------------------------
from apps.identity.views.social.google import GoogleOAuthLoginView

# -------------------------------
# PROFILE MANAGEMENT
# -------------------------------
from apps.identity.views.profile.profile_views import UserProfileView
from apps.identity.views.profile.profile_update import ProfileUpdateView
from apps.identity.views.profile.profile_security import ProfileSecurityView
from apps.identity.views.profile.settings_security import SettingsSecurityView

# -------------------------------
# APP NAMESPACE
# -------------------------------
app_name = "users"

# -------------------------------
# ROUTER FOR ADMIN USER CRUD
# -------------------------------
router = DefaultRouter()
router.register(r"users", UserAdminViewSet, basename="user")
router.register(r"admin/core-students", CoreStudentAdminViewSet, basename="core-student")
router.register(r"superadmin/institutions", InstitutionViewSet, basename="institution")

# -------------------------------
# URLPATTERNS
# -------------------------------
urlpatterns = [
    # ============================
    # JWT AUTH
    # ============================
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("logout-all/", LogoutAllView.as_view(), name="auth_logout_all"),
    path("session/bootstrap/", SessionBootstrapView.as_view(), name="session_bootstrap"),
    path("token/secure/", CustomTokenSecureView.as_view(), name="token_secure"),
    path("token/verify/", CustomTokenVerifyView.as_view(), name="token_verify"),
    path("auth/v2/check-identity/", IdentityCheckView.as_view(), name="v2-check-identity"),
    path("auth/v2/activate/", ActivationCompleteView.as_view(), name="v2-activate"),
    path("auth/v2/student/login/", StudentLoginView.as_view(), name="v2-student-login"),
    path("auth/v2/faculty/login/", FacultyLoginView.as_view(), name="v2-faculty-login"),
    path("auth/v2/faculty/mfa/", FacultyMFAVerifyView.as_view(), name="v2-faculty-mfa"),
    path("auth/admin/verify-ticket/", VerifyAdminTicketView.as_view(), name="admin-verify-ticket"),
    path("public/institutions/", PublicInstitutionListView.as_view(), name="public-institution-list"),
    path("public/register/", InstitutionRegistrationView.as_view(), name="institution-register"),

    # ============================
    # DEVICE / SESSION MANAGEMENT
    # ============================
    path("sessions/", SessionListView.as_view(), name="session_list"),
    path("sessions/<int:pk>/logout/", SessionLogoutView.as_view(), name="session_logout"),
    path("sessions/logout-all/", SessionLogoutAllView.as_view(), name="session_logout_all"),
    path("sessions/update-location/", UpdateSessionLocationView.as_view(), name="update_session_location"),
    path("sessions/validate/", SessionValidateView.as_view(), name="session_validate"),
    path("secure-device/", SecureDeviceView.as_view(), name="secure_device"), 

    # ============================
    # CURRENT USER
    # ============================
    path("me/", MeView.as_view(), name="me"),

    # ============================
    # STUDENT MANAGEMENT (ADMIN)
    # ============================
    path("admin/create-student/", AdminCreateStudentView.as_view(), name="admin_create_student"),
    path("admin/search-student/", AdminStudentSearchView.as_view(), name="admin_search_student"),
    path("admin/invite-students/", BulkInviteStudentsView.as_view(), name="admin_invite_students"),
    path("admin/bulk-seed-students/", BulkStudentUploadView.as_view(), name="admin_bulk_seed_students"),
    path("admin/student/<int:pk>/", AdminStudentDetailView.as_view(), name="admin_student_detail"),   # ✅ NEW

    # ============================
    # TEACHER MANAGEMENT (ADMIN)
    # ============================
    path("admin/create-teacher/", AdminCreateTeacherView.as_view(), name="admin_create_teacher"),
    path("admin/search-teacher/", AdminTeacherSearchView.as_view(), name="admin_search_teacher"),
    path("admin/teacher/<int:pk>/", AdminTeacherDetailView.as_view(), name="admin_teacher_detail"),   # ✅ NEW

    # ============================
    # PROFILE MANAGEMENT (SELF)
    # ============================
    path("profile/", UserProfileView.as_view(), name="profile_view"),
    path("profile/update/", ProfileUpdateView.as_view(), name="profile_update"),
    path("profile/security/", ProfileSecurityView.as_view(), name="profile_security"),
    path("profile/settings/", SettingsSecurityView.as_view(), name="profile_settings"),

    # ============================
    # PASSWORD MGMT
    # ============================
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path(
        "reset-password-request/",
        ResetPasswordRequestView.as_view(),
        name="reset_password_request",
    ),
    path(
        "reset-password-validate/<str:token>/",
        ResetPasswordValidateView.as_view(),
        name="reset_password_validate",
    ),
    path(
        "reset-password-confirm/<str:token>/",
        ResetPasswordConfirmView.as_view(),
        name="reset_password_confirm",
    ),

    # ============================
    # ADMIN AUTH / 2FA
    # ============================
    path("admin/login/", AdminTokenObtainPairView.as_view(), name="admin_login"),
    path("admin/verify-otp/", AdminVerifyOTPView.as_view(), name="admin_verify_otp"),

    # ============================
    # SOCIAL LOGIN
    # ============================
    path("social/google/", GoogleOAuthLoginView.as_view(), name="google_login"),

    # ============================
    # ROUTER (Admin CRUD)
    # ============================
    path("", include(router.urls)),
]

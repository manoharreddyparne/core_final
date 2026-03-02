from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.auip_institution.views.tenant_auth_views import InstAdminTokenObtainPairView
from apps.auip_institution.views.student_views import RegisteredStudentViewSet
from apps.auip_institution.views.bulk_upload_views import TenantBulkStudentUploadView
from apps.auip_institution.views.faculty_views import RegisteredFacultyViewSet, TenantBulkFacultyUploadView

router = DefaultRouter()
router.register(r'students', RegisteredStudentViewSet, basename='tenant-student')
router.register(r'faculty', RegisteredFacultyViewSet, basename='tenant-faculty')

from apps.auip_institution.views.dashboard_views import InstDashboardStatsView

urlpatterns = [
    path('auth/inst-admin/login/', InstAdminTokenObtainPairView.as_view(), name='inst-admin-login'),
    path('bulk-seed-students/', TenantBulkStudentUploadView.as_view(), name='tenant-bulk-seed'),
    path('bulk-seed-faculty/', TenantBulkFacultyUploadView.as_view(), name='tenant-bulk-seed-faculty'),
    path('dashboard/stats/', InstDashboardStatsView.as_view(), name='inst-dashboard-stats'),
    path('', include(router.urls)),
]

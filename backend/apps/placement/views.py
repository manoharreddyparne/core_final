from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.placement.models import PlacementDrive, PlacementApplication
from apps.placement.serializers import PlacementDriveSerializer, PlacementApplicationSerializer
from apps.placement.services.eligibility_service import EligibilityService
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin, IsTenantStudent
from apps.identity.utils.response_utils import success_response, error_response
from django_tenants.utils import schema_context
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class PlacementDriveViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Placement Drives.
    Admins (TPOs) manage drives.
    Students view eligible drives and apply.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = PlacementDriveSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'activate', 'eligible_students']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Isolation is handled by TenantAuthentication setting the schema
        return PlacementDrive.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Prepares the drive for student applications and triggers notifications."""
        drive = self.get_object()
        if drive.status != 'DRAFT':
            return error_response("Only draft drives can be activated.", code=400)
        
        drive.status = 'ACTIVE'
        drive.save()
        
        # 🔔 Trigger Notifications to Eligible Students
        # TODO: Implement background task for notifications
        eligible_students = EligibilityService.filter_eligible_students(drive)
        # For now, we'll just log or return count
        
        return success_response(
            f"Drive '{drive.company_name}' activated. {eligible_students.count()} students are eligible.",
            data={"eligible_count": eligible_students.count()}
        )

    @action(detail=False, methods=['get'], permission_classes=[IsTenantStudent])
    def my_eligible_drives(self, request):
        """Returns drives the current student is eligible for."""
        if not hasattr(request.user, 'academic_ref') or not request.user.academic_ref:
            return error_response("Student academic record not found.")

        drives = EligibilityService.get_eligible_drives_for_student(request.user.academic_ref)
        serializer = self.get_serializer(drives, many=True)
        return success_response("Eligible drives retrieved", data=serializer.data)

class PlacementApplicationViewSet(viewsets.ModelViewSet):
    """
    Handling student applications for drives.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = PlacementApplicationSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsTenantStudent()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'role') and user.role == 'STUDENT':
            if hasattr(user, 'academic_ref') and user.academic_ref:
                return PlacementApplication.objects.filter(student=user.academic_ref)
            return PlacementApplication.objects.none()
        return PlacementApplication.objects.all()

    def create(self, request, *args, **kwargs):
        user = request.user
        if not hasattr(user, 'academic_ref') or not user.academic_ref:
            return error_response("Student academic record not found.")

        drive_id = request.data.get('drive')
        try:
            drive = PlacementDrive.objects.get(id=drive_id, status='ACTIVE')
        except PlacementDrive.DoesNotExist:
            return error_response("Active drive not found.", code=404)

        # Eligibility Check
        is_eligible, reason = EligibilityService.evaluate_student(user.academic_ref, drive)
        if not is_eligible:
            return error_response(f"Eligibility Mismatch: {reason}", code=403)

        # Duplicate Check
        if PlacementApplication.objects.filter(drive=drive, student=user.academic_ref).exists():
            return error_response("You have already applied for this drive.")

        # Atomic apply logic (One student one job rule could be checked here)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(student=user.academic_ref)
        
        return success_response("Application submitted successfully", data=serializer.data)

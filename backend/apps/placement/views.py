from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.placement.models import PlacementDrive, PlacementApplication
from apps.placement.serializers import PlacementDriveSerializer, PlacementApplicationSerializer
from apps.placement.services.eligibility_service import EligibilityService
from apps.placement.services.eligibility_engine import EligibilityEngine
from apps.placement.services.jd_parser import JDExtractionService
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
        
        # Allow re-activation or update if it's already active
        drive.status = 'ACTIVE'
        drive.save()
        
        # 🔔 Trigger Notifications to Eligible Students
        # We now use the unified EligibilityEngine logic (Criteria + Manual)
        qualified_students = EligibilityEngine.get_qualified_students_qs(drive)
        qualified_count = qualified_students.count()
        
        return success_response(
            f"Drive '{drive.company_name}' activated (ID: {drive.id}). {qualified_count} students are eligible.",
            data={"eligible_count": qualified_count}
        )

    @action(detail=False, methods=['post'])
    def extract_jd(self, request):
        """Upload a JD PDF and return AI extracted JSON rules."""
        pdf_file = request.FILES.get('file')
        if not pdf_file:
            return error_response("Please upload a 'file' (PDF).", code=400)
            
        extraction = JDExtractionService.extract_from_pdf(pdf_file)
        if "error" in extraction:
            return error_response(extraction['error'], code=500, data=extraction)
            
        return success_response("JD extracted successfully", data=extraction)

    @action(detail=True, methods=['get'])
    def eligibility_stats(self, request, pk=None):
        """Returns live counts and branch un-pivots of eligible students."""
        drive = self.get_object()
        report = EligibilityEngine.get_eligibility_report(drive)
        return success_response("Eligibility stats retrieved.", data=report)
        
    @action(detail=True, methods=['post'])
    def broadcast(self, request, pk=None):
        """Triggers email and app notifications to all eligible students."""
        drive = self.get_object()
            
        if drive.status != 'ACTIVE':
            return error_response("Drive must be ACTIVE to broadcast.", code=400)
            
        EligibilityEngine.broadcast_invitations(drive)
        return success_response("Invitations broadcasted successfully.")

    @action(detail=False, methods=['get'], permission_classes=[IsTenantStudent])
    def my_eligible_drives(self, request):
        """Returns drives the current student is eligible for."""
        if not hasattr(request.user, 'academic_ref') or not request.user.academic_ref:
            return error_response("Student academic record not found.")

        drives = EligibilityService.get_eligible_drives_for_student(request.user.academic_ref)
        serializer = self.get_serializer(drives, many=True)
        return success_response("Eligible drives retrieved", data=serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def manual_add_student(self, request, pk=None):
        """Allows TPOs to manually add a student to a drive, bypassing eligibility and deadlines."""
        drive = self.get_object()
        roll_number = request.data.get('roll_number')
        if not roll_number:
            return error_response("Please provide a roll_number", code=400)
            
        try:
            from apps.auip_institution.models import StudentAcademicRegistry
            student = StudentAcademicRegistry.objects.get(roll_number=roll_number)
        except Exception:
            return error_response(f"Student {roll_number} not found in Academic Registry.", code=404)
            
        if PlacementApplication.objects.filter(drive=drive, student=student).exists():
            return error_response(f"Student {roll_number} is already applied or added.")
            
        app = PlacementApplication.objects.create(
            drive=drive,
            student=student,
            status='SHORTLISTED' # Manually added students go straight to shortlisted or applied
        )

        # 🔔 Notify Student Immediately of Manual Assignment
        try:
            from apps.notifications.services import NotificationDispatcher
            if hasattr(student, 'studentauthorizedaccount'):
                NotificationDispatcher.send_notification(
                    user=student.studentauthorizedaccount,
                    title=f"Opportunity: {drive.company_name}",
                    message=f"You have been manually added/shortlisted for the {drive.role} drive. View details in your Careers hub!",
                    type='PLACEMENT',
                    action_link=f"/placement-hub/"
                )
        except Exception as e:
            logger.error(f"Failed to notify manual add student: {str(e)}")

        return success_response(f"Student {roll_number} manually added to drive.", data={"app_id": app.id})

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
            
        qs = PlacementApplication.objects.select_related('student', 'drive')
        drive_id = self.request.query_params.get('drive')
        if drive_id:
            qs = qs.filter(drive_id=drive_id)
        return qs

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

        # Deadline Check
        if timezone.now() > drive.deadline:
            return error_response("Application deadline has passed.", code=403)

        # Duplicate Check
        if PlacementApplication.objects.filter(drive=drive, student=user.academic_ref).exists():
            return error_response("You have already applied for this drive.")

        # Atomic apply logic (One student one job rule could be checked here)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(student=user.academic_ref)
        
        return success_response("Application submitted successfully", data=serializer.data)

    @action(detail=True, methods=['patch'], permission_classes=[IsTenantAdmin])
    def update_status(self, request, pk=None):
        """Allow TPOs to update the lifecycle stage of an application."""
        app = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return error_response("status is required", code=400)
            
        valid_statuses = dict(PlacementApplication.APPLICATION_STATUS).keys()
        if new_status not in valid_statuses:
            return error_response(f"Invalid status. Must be one of {list(valid_statuses)}", code=400)
            
        app.status = new_status
        app.save(update_fields=['status'])
        
        # We can also add stages to the history if required
        return success_response(f"Student application status updated to {new_status}")

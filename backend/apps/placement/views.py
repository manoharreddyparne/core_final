from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.placement.models import PlacementDrive, PlacementApplication
from apps.placement.serializers import PlacementDriveSerializer, PlacementApplicationSerializer, PlacementProcessStageSerializer
from apps.placement.services.eligibility_service import EligibilityService
from apps.placement.services.eligibility_engine import EligibilityEngine
from apps.placement.services.jd_parser import JDExtractionService
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantAdmin, IsTenantStudent
from apps.identity.utils.response_utils import success_response, error_response
from django_tenants.utils import schema_context
from django.utils import timezone
from django.db.models import Count, Q
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        drive = serializer.save()
        
        # Consistent with other AI endpoints
        return success_response(
            f"Drive '{drive.company_name}' initialized successfully.",
            data=serializer.data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        drive = serializer.save()
        
        return success_response(
            f"Strategic configuration for '{drive.company_name}' synchronized.",
            data=serializer.data
        )

    def perform_create(self, serializer):
        # We handle broadcast via dedicated endpoint now
        serializer.save()

    def perform_update(self, serializer):
        # We handle broadcast via dedicated endpoint now
        serializer.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Prepares the drive for student applications and triggers notifications."""
        drive = self.get_object()
        
        # Allow re-activation or update if it's already active
        drive.status = 'ACTIVE'
        drive.save()
        
        # 🔔 Prepare stats for response
        report = EligibilityEngine.get_eligibility_report(drive)
        
        return success_response(
            f"Drive '{drive.company_name}' activated (ID: {drive.id}). {report['total_eligible']} students are eligible.",
            data={"eligible_count": report['total_eligible'], "report": report}
        )

    @action(detail=False, methods=['post'])
    def extract_jd(self, request):
        """Upload a JD PDF or paste JD Text to return AI extracted JSON rules."""
        pdf_file = request.FILES.get('file')
        jd_text = request.data.get('text')
        
        if not pdf_file and not jd_text:
            return error_response("Please upload a 'file' (PDF/Image) or provide 'text' for extraction.", code=400)
            
        if pdf_file:
            # Route to Multimodal Vision if it's an image file
            ext = pdf_file.name.split('.')[-1].lower()
            if ext in ['jpg', 'jpeg', 'png', 'webp', 'heic']:
                extraction = JDExtractionService.extract_from_image(pdf_file)
            else:
                extraction = JDExtractionService.extract_from_pdf(pdf_file)
        else:
            extraction = JDExtractionService.extract_from_text(jd_text)
            
        if "error" in extraction:
            return error_response(extraction['error'], code=500, data=extraction)
            
        return success_response("JD extracted successfully", data=extraction)

    @action(detail=False, methods=['post'])
    def check_eligibility(self, request):
        """
        Dynamically calculates eligible students (both activated and unactivated)
        based on the form data *before* the drive is saved.
        """
        from django.db import connection
        from apps.auip_institution.models import StudentAcademicRegistry
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Invalid drive parameters", data=serializer.errors, code=400)
            
        drive = PlacementDrive(**serializer.validated_data)
        
        # ─── DIAGNOSTIC BLOCK ────────────────────────────────────────────
        total_students = StudentAcademicRegistry.objects.count()
        schema = connection.schema_name
        
        # Sample the first 3 students to see their history_data structure
        sample_keys = []
        sample_10th = []
        for s in StudentAcademicRegistry.objects.order_by('?')[:5]:
            if s.history_data:
                sample_keys.append(list(s.history_data.keys()))
                val_10th = s.history_data.get('10th_percent', s.history_data.get('ssc_percent', 'KEY_MISSING'))
                sample_10th.append({
                    'roll': s.roll_number,
                    '10th_raw': val_10th,
                    'all_keys': list(s.history_data.keys())
                })
        
        debug_info = {
            'schema': schema,
            'total_students': total_students,
            'drive_filters': {
                'min_10th': float(drive.min_10th_percent or 0),
                'min_12th': float(drive.min_12th_percent or 0),
                'min_cgpa': float(drive.min_cgpa or 0),
                'min_ug_pct': float(drive.min_ug_percentage or 0),
                'branches': drive.eligible_branches,
                'backlogs': drive.allowed_active_backlogs,
            },
            'sample_10th_data': sample_10th,
        }
        logger.info(f"[ELIGIBILITY-DEBUG] {debug_info}")
        # ─── END DIAGNOSTIC ──────────────────────────────────────────────
        
        search_query = request.data.get('q', '').strip()
        page = int(request.data.get('page', 1))
        page_size = int(request.data.get('page_size', 50))
        
        qualified_qs = EligibilityEngine.get_manifest_preview_qs(drive)
        
        # Apply Search Filtering within manifest
        if search_query:
            from django.db.models import Q
            tokens = search_query.split()
            manifest_filter = Q()
            for token in tokens:
                manifest_filter &= (Q(roll_number__icontains=token) | Q(full_name__icontains=token))
            qualified_qs = qualified_qs.filter(manifest_filter)

        total_count = qualified_qs.count()
        criteria_ids = set(EligibilityEngine.get_eligible_students_qs(drive).values_list('id', flat=True))
        
        from django.db.models import Exists, OuterRef
        from apps.auip_institution.models import StudentAuthorizedAccount
        
        final_qs = qualified_qs.annotate(
            is_activated=Exists(StudentAuthorizedAccount.objects.filter(academic_ref=OuterRef('pk')))
        ).values('id', 'roll_number', 'full_name', 'branch', 'cgpa', 'is_activated').order_by('-is_activated', 'roll_number')
        
        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        final_list = final_qs[start:end]
        
        data_with_flags = []
        for s in final_list:
            data_with_flags.append({**s, "is_manual": s['id'] not in criteria_ids})
            
        return success_response(
            "Eligibility preview generated.", 
            data={
                "eligible_students": data_with_flags, 
                "total_count": total_count,
                "current_page": page,
                "page_size": page_size,
                "_debug": debug_info
            }
        )

    @action(detail=False, methods=['get'])
    def search_students(self, request):
        """
        Word-order-independent fuzzy student search.
        'Manohar Reddy Parne' will match 'Parne Manohar Reddy' because
        every token is checked independently against name AND roll_number.
        """
        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return success_response("Search term too short.", data=[])
            
        from apps.auip_institution.models import StudentAcademicRegistry, StudentAuthorizedAccount
        from django.db.models import Exists, OuterRef, Q
        
        # Split into tokens — each token must appear in roll_number OR full_name
        tokens = query.split()
        combined_filter = Q()
        for token in tokens:
            combined_filter &= (Q(roll_number__icontains=token) | Q(full_name__icontains=token))
        
        results = StudentAcademicRegistry.objects.filter(combined_filter).order_by('full_name')[:15]
        
        data = results.annotate(
            is_activated=Exists(
                StudentAuthorizedAccount.objects.filter(academic_ref=OuterRef('pk'))
            )
        ).values('id', 'roll_number', 'full_name', 'branch', 'cgpa', 'is_activated')
        
        return success_response(f"Found {len(data)} students.", data=list(data))

    @action(detail=True, methods=['get'])
    def eligibility_stats(self, request, pk=None):
        """Returns live counts and branch un-pivots of eligible students."""
        drive = self.get_object()
        report = EligibilityEngine.get_eligibility_report(drive)
        return success_response("Eligibility stats retrieved.", data=report)

    @action(detail=True, methods=['post'])
    def broadcast(self, request, pk=None):
        """
        Triggers notifications to ALL eligible students:
        - Active accounts → UI notification + email
        - Inactive accounts → email only with activation prompt
        Also auto-creates a placement group chat.
        """
        drive = self.get_object()
        if drive.status != 'ACTIVE':
            drive.status = 'ACTIVE'
            drive.save()
            
        # 🏁 PRE-QUEUING CACHE: Ensures frontend poller sees "starting" state immediately
        from django.core.cache import cache
        cache.set(f"broadcast_progress_{drive.id}", {
            "type": "broadcast_status",
            "status": "processing",
            "percentage": 1,
            "current": 0,
            "total": 0,
            "message": "Initializing Neural Orchestrator..."
        }, timeout=600)

        result = EligibilityEngine.broadcast_invitations(drive)
        return success_response(
            "Broadcast started",
            data={
                "task_id": result.get('task_id'),
                "message": result.get('message')
            }
        )

    @action(detail=True, methods=['get'])
    def broadcast_progress(self, request, pk=None):
        """HTTP polling fallback for broadcast progress (when WS channel layer fails)."""
        from django.core.cache import cache
        drive = self.get_object()
        cache_key = f"broadcast_progress_{drive.id}"
        progress = cache.get(cache_key)
        if progress:
            return success_response("Progress retrieved.", data=progress)
        # If no cached progress, check if drive is already broadcasted
        if drive.is_broadcasted:
            return success_response("Broadcast complete.", data={
                "status": "done", "percentage": 100, "current": 0, "total": 0,
                "message": "Broadcast complete!"
            })
        return success_response("No active broadcast.", data={
            "status": "idle", "percentage": 0, "current": 0, "total": 0,
            "message": "Waiting for broadcast to start..."
        })

    @action(detail=False, methods=['get'], permission_classes=[IsTenantStudent])
    def my_eligible_drives(self, request):
        """Returns drives the current student is eligible for."""
        if not hasattr(request.user, 'academic_ref') or not request.user.academic_ref:
            return error_response("Student academic record not found.")

        drives = EligibilityService.get_eligible_drives_for_student(request.user.academic_ref)
        # Order by creation date descending
        drives = drives.order_by('-created_at')
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
            
        valid_statuses = [c[0] for c in PlacementApplication.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return error_response(f"Invalid status. Must be one of {valid_statuses}", code=400)
            
        app.status = new_status
        app.save(update_fields=['status'])
        
        return success_response(f"Student application status updated to {new_status}")

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def add_stage(self, request, pk=None):
        """Add a process stage (Mock, Interview, etc.) to an application."""
        app = self.get_object()
        serializer = PlacementProcessStageSerializer(data={**request.data, 'application': app.id})
        if serializer.is_valid():
            serializer.save()
            return success_response("Process stage added", data=serializer.data)
        return error_response("Validation error", extra=serializer.errors)

    @action(detail=True, methods=['patch'], permission_classes=[IsTenantAdmin], url_path='update_stage/(?P<stage_id>[^/.]+)')
    def update_stage(self, request, pk=None, stage_id=None):
        """Update a specific process stage."""
        from apps.placement.models import PlacementProcessStage
        try:
            stage = PlacementProcessStage.objects.get(id=stage_id, application_id=pk)
        except PlacementProcessStage.DoesNotExist:
            return error_response("Stage not found", code=404)
            
        serializer = PlacementProcessStageSerializer(stage, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response("Process stage updated", data=serializer.data)
        return error_response("Validation error", extra=serializer.errors)


class PlacementAnalyticsSummaryView(APIView):
    """
    Aggregated placement analytics for TPO Analytics Dashboard.
    GET /api/placement/analytics/summary/
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        try:
            from apps.auip_institution.models import StudentAcademicRegistry

            all_drives = PlacementDrive.objects.all()
            total_drives = all_drives.count()
            active_drives = all_drives.filter(status='ACTIVE').count()
            companies_visited = all_drives.values('company_name').distinct().count()

            # Applications aggregate
            all_apps = PlacementApplication.objects.select_related('student', 'drive')
            placed_apps = all_apps.filter(status='PLACED')
            placed_count = placed_apps.count()
            total_students = StudentAcademicRegistry.objects.count()

            placement_pct = round((placed_count / total_students * 100), 1) if total_students > 0 else 0

            # Package average — parse "12 LPA" style strings
            packages: list[float] = []
            for d in all_drives.exclude(package_details='').values_list('package_details', flat=True):
                try:
                    num = float(''.join(filter(lambda c: c.isdigit() or c == '.', d.split()[0])))
                    packages.append(float(num))
                except Exception:
                    pass
            _avg: float = float(sum(packages) / len(packages)) if packages else 0.0
            avg_package = f"{_avg.__round__(1)} LPA" if packages else "N/A"

            # Per-drive stats
            drives_data = []
            for drive in all_drives.order_by('-created_at')[:50]:
                drive_apps = all_apps.filter(drive=drive)
                drives_data.append({
                    "company_name": drive.company_name,
                    "role": drive.role,
                    "status": drive.status,
                    "applied_count": drive_apps.count(),
                    "placed_count": drive_apps.filter(status='PLACED').count(),
                    "package_details": drive.package_details,
                    "deadline": drive.deadline.isoformat() if drive.deadline else None
                })

            # Branch-wise stats from student registry + placed applications
            branch_qs = StudentAcademicRegistry.objects.values('branch').annotate(total=Count('id'))
            branch_stats = {}
            for item in branch_qs:
                branch = item['branch'] or 'Unknown'
                placed_in_branch = placed_apps.filter(student__branch=branch).count()
                branch_stats[branch] = {"placed": placed_in_branch, "total": item['total']}

            # Batch (passout_year) stats
            batch_qs = StudentAcademicRegistry.objects.values('passout_year').annotate(total=Count('id'))
            batch_stats = {}
            for item in batch_qs:
                year = str(item['passout_year']) if item['passout_year'] else 'Unknown'
                placed_in_batch = placed_apps.filter(student__passout_year=item['passout_year']).count()
                batch_stats[year] = {"placed": placed_in_batch, "total": item['total']}

            return success_response("Analytics summary retrieved", data={
                "total_students": total_students,
                "placed_students": placed_count,
                "placement_percentage": placement_pct,
                "avg_package": avg_package,
                "total_drives": total_drives,
                "active_drives": active_drives,
                "companies_visited": companies_visited,
                "drives": drives_data,
                "branch_stats": branch_stats,
                "batch_stats": batch_stats,
            })
        except Exception as e:
            logger.error(f"[PLACEMENT-ANALYTICS-ERROR] {e}")
            return error_response(f"Failed to generate analytics: {str(e)}", code=500)

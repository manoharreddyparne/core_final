from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StudentIntelligenceProfile, StudentBehaviorLog, GovernancePolicy
from .serializers import StudentIntelligenceProfileSerializer, GovernancePolicySerializer
from apps.core_brain.services import BrainOrchestrator
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response

class IntelligenceProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Exposes the 'Content Matrix' and behavior-derived intelligence.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = StudentIntelligenceProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'STUDENT':
            return StudentIntelligenceProfile.objects.filter(student=self.request.user.academic_ref)
        return StudentIntelligenceProfile.objects.all()

    @action(detail=False, methods=['post'])
    def sync_matrix(self, request):
        """
        Manually trigger a matrix rebuild (The 'Model Training' part).
        """
        student = getattr(request.user, 'academic_ref', None)
        if not student:
            return error_response("Student academic record not found.")
            
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        from .utils.brain_engine import GovernanceBrain
        results = GovernanceBrain.retrain_for_student(profile)
        
        return success_response("Student matrix synced and behavior trained.", data={
            "behavior_score": results["behavior_score"],
            "risk_factor": results["risk_factor"],
            "controls": results["controls"]
        })

class GovernancePolicyViewSet(viewsets.ModelViewSet):
    """
    TPOs/Admins can manage the policies that control user features.
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = GovernancePolicySerializer
    queryset = GovernancePolicy.objects.all()
    
    def get_permissions(self):
        from apps.auip_institution.permissions import IsTenantAdmin
        return [IsTenantAdmin()]

from .models import Blog, Newsletter, DocumentTemplate, BlogLike, BlogComment
from .serializers import BlogSerializer, NewsletterSerializer, DocumentTemplateSerializer
from apps.auip_institution.permissions import IsTenantAdmin

class BlogViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    queryset = Blog.objects.all().order_by('-created_at')
    serializer_class = BlogSerializer

    def get_permissions(self):
        # Students can create blogs (Social Posts)
        if self.action in ['create']:
            return [permissions.IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()] # Only admin can delete/hide for now, or owner (TODO)
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        blog = self.get_object()
        like, created = BlogLike.objects.get_or_create(
            blog=blog,
            user_id=request.user.id,
            user_role=request.user.role
        )
        if not created:
            like.delete()
            blog.likes_count = max(0, blog.likes_count - 1)
            blog.save()
            return success_response("Blog unliked", data={"likes": blog.likes_count})
        
        blog.likes_count += 1
        blog.save()
        return success_response("Blog liked", data={"likes": blog.likes_count})

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        blog = self.get_object()
        content = request.data.get('content')
        if not content:
            return error_response("Comment content required.")
            
        comment = BlogComment.objects.create(
            blog=blog,
            user_id=request.user.id,
            user_role=request.user.role,
            user_name=request.user.full_name if hasattr(request.user, 'full_name') else f"{request.user.first_name} {request.user.last_name}",
            content=content
        )
        blog.comments_count += 1
        blog.save()
        
        return success_response("Comment added", data={"comment_id": comment.id})

    @action(detail=False, methods=['get'])
    def for_you(self, request):
        """
        Returns blogs matching student's interest matrix tags.
        """
        if request.user.role != 'STUDENT':
            return self.list(request)
            
        student = request.user.academic_ref
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # Simple match: If blog tags intersect with top interests
        interests = profile.interest_matrix.keys()
        
        # In a real system, we'd use a more complex Query (Q) or semantic search
        queryset = Blog.objects.filter(is_published=True)
        recommended = [b for b in queryset if any(tag in interests for tag in b.tags)]
        
        # If no recommendation, return latest
        if not recommended:
            recommended = queryset[:5]
            
        serializer = self.get_serializer(recommended, many=True)
        return success_response("Personalized feed retrieved", data=serializer.data)

class NewsletterViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    queryset = Newsletter.objects.all().order_by('-created_at')
    serializer_class = NewsletterSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

class DocumentTemplateViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer
    permission_classes = [IsTenantAdmin]


from rest_framework.views import APIView
from apps.auip_institution.models import StudentAcademicRegistry

class GovernanceBrainView(APIView):
    """
    Endpoints for the Governance Brain Dashboard.
    GET  /api/governance/brain/dashboard/  — Stats + all student intelligence profiles
    POST /api/governance/brain/recompute/  — Trigger full matrix rebuild
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        """Returns aggregated student intelligence profiles for the Brain Dashboard."""
        try:
            from django.db.models import Avg
            profiles_qs = StudentIntelligenceProfile.objects.select_related('student').all()

            profiles_data = []
            for p in profiles_qs:
                s = p.student
                profiles_data.append({
                    "id": s.id,
                    "roll_number": s.roll_number,
                    "full_name": s.full_name,
                    "branch": s.branch or "N/A",
                    "cgpa": float(s.cgpa) if s.cgpa else 0.0,
                    "batch_year": s.passout_year or 0,
                    "readiness_score": p.readiness_score,
                    "behavior_score": p.behavior_score,
                    "risk_factor": float(p.risk_factor),
                    "interest_matrix": p.interest_matrix or {},
                    "last_computed": p.last_computed.isoformat() if p.last_computed else None,
                    "is_at_risk": p.risk_factor >= 0.4 or p.readiness_score < 40,
                })

            total = len(profiles_data)
            avg_readiness = round(sum(p["readiness_score"] for p in profiles_data) / total) if total else 0
            at_risk = sum(1 for p in profiles_data if p["is_at_risk"])
            high_performers = sum(1 for p in profiles_data if p["readiness_score"] >= 70)

            from django.utils import timezone
            stats = {
                "total_students": total,
                "avg_readiness": avg_readiness,
                "at_risk_count": at_risk,
                "high_performers": high_performers,
                "last_updated": timezone.now().isoformat(),
            }

            return success_response("Brain dashboard data retrieved", data={
                "profiles": profiles_data,
                "stats": stats,
            })
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[BRAIN-DASHBOARD-ERROR] {e}")
            return error_response(f"Failed to load brain dashboard: {str(e)}", code=500)

    def post(self, request):
        """Trigger matrix recompute for all students who have intelligence profiles."""
        try:
            from apps.core_brain.services import BrainOrchestrator
            profiles = StudentIntelligenceProfile.objects.select_related('student').all()
            rebuilt = 0
            errors = 0
            for profile in profiles:
                try:
                    BrainOrchestrator.rebuild_student_matrix(profile.student.id)
                    rebuilt += 1
                except Exception as e:
                    errors += 1
                    import logging
                    logging.getLogger(__name__).error(f"[BRAIN-RECOMPUTE-ERR] Student {profile.student.id}: {e}")

            return success_response(
                f"Matrix recomputed: {rebuilt} students updated, {errors} errors.",
                data={"rebuilt": rebuilt, "errors": errors}
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[BRAIN-RECOMPUTE-CRITICAL] {e}")
            return error_response(f"Recompute failed: {str(e)}", code=500)

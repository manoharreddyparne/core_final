from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import AIQuerySession, StudentResumeInsight, PlacementTrendInsight
from .serializers import AIQuerySessionSerializer, StudentResumeInsightSerializer, PlacementTrendInsightSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.auip_institution.permissions import IsTenantStudent, IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

class AIIntelligenceViewSet(viewsets.ViewSet):
    """
    Custom ViewSet for AI-powered intelligence services.
    """
    authentication_classes = [TenantAuthentication]

    @action(detail=False, methods=['post'], permission_classes=[IsTenantStudent])
    def ask_ai(self, request):
        """
        Main entry point for student queries (Career Advice, Tech Doubts).
        Will eventually connect to an LLM service.
        """
        import logging
        logger = logging.getLogger(__name__)
        from django_tenants.utils import schema_context
        
        # Determine schema from request.tenant or request.auth
        schema = getattr(request.tenant, 'schema_name', None) or \
                 (request.auth.get('schema') if isinstance(request.auth, dict) else None)
        
        if not schema:
            return error_response("Tenant context missing.")

        try:
            with schema_context(schema):
                student = getattr(request.user, 'academic_ref', None)
                if not student:
                    return error_response("Student academic record required.")
                    
                query_text = request.data.get('query')
                context_type = request.data.get('context', 'CAREER')
                
                if not query_text:
                    return error_response("Query text is required.")

                # Prepare context for AI
                from django.utils import timezone
                current_time = timezone.now().strftime("%Y-%m-%d %H:%M:%S")
                
                context_data = {
                    "student_name": f"{student.first_name} {student.last_name}",
                    "branch": student.branch,
                    "year": student.admission_year,
                    "current_time": current_time,
                    "context_type": context_type
                }
                
                from .utils.ai_engine import call_gemini_ai
                system_instr = (
                    "You are AUIP Assistant, a professional AI mentor. "
                    "You provide career advice, resume tips, and technical guidance. "
                    "Be concise, professional, and helpful. "
                    f"Current server time is {current_time}. If asked about time, use this value."
                )
                
                ai_response = call_gemini_ai(
                    prompt=query_text,
                    system_instruction=system_instr,
                    context_data=str(context_data)
                )
                
                session = AIQuerySession.objects.create(
                    student=student,
                    query_text=query_text,
                    ai_response=ai_response,
                    context_type=context_type
                )
                
                return success_response("AI analysis complete", data={
                    "session_id": session.id,
                    "response": ai_response
                })
        except Exception as e:
            logger.error(f"[AI-INTELLIGENCE-ERROR] {e}", exc_info=True)
            return error_response(f"Internal processing failed: {str(e)}", code=500)

class ResumeInsightViewSet(viewsets.ModelViewSet):
    authentication_classes = [TenantAuthentication]
    queryset = StudentResumeInsight.objects.all()
    serializer_class = StudentResumeInsightSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdmin()] # Only admins/AI-batch systems create insights
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'role') and user.role == 'STUDENT':
            return StudentResumeInsight.objects.filter(student=user.academic_ref)
        return StudentResumeInsight.objects.all()

class PlacementTrendViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [TenantAuthentication]
    queryset = PlacementTrendInsight.objects.all().order_by('-generated_at')
    serializer_class = PlacementTrendInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

class StudentDashboardViewSet(viewsets.ViewSet):
    """
    Consolidated AI Dashboard for the student.
    Aggregates Readiness, Behavior, ATS status, and AI Guidance.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [IsTenantStudent]

    def list(self, request):
        student = request.user.academic_ref
        from apps.governance.models import StudentIntelligenceProfile
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # 1. Placement Stats
        from apps.placement.models import PlacementApplication
        applications = PlacementApplication.objects.filter(student=student)
        application_stats = {
            "total": applications.count(),
            "shortlisted": applications.filter(status='SHORTLISTED').count(),
            "active_stages": sum([a.stages.filter(status='PENDING').count() for a in applications])
        }

        # 2. AI Guidance Activity
        from apps.intelligence.models import LLMInteraction
        recent_ai = LLMInteraction.objects.filter(student=student).order_by('-created_at')[:3]

        # 3. Governance Context
        governance = {
            "readiness": profile.readiness_score,
            "behavior": profile.behavior_score,
            "top_interests": sorted(profile.interest_matrix.items(), key=lambda x: x[1], reverse=True)[:3],
            "controls": profile.active_controls
        }

        # 4. Social/Blog Feed
        from apps.governance.models import Blog
        from apps.governance.serializers import BlogSerializer
        recent_blogs = Blog.objects.filter(is_published=True).order_by('-created_at')[:4]
        blog_data = BlogSerializer(recent_blogs, many=True).data

        return success_response("Student AI Dashboard retrieved", data={
            "governance": governance,
            "placement_summary": application_stats,
            "recent_ai_guidance": [ai.prompt for ai in recent_ai],
            "recent_blogs": blog_data,
            "system_status": "All systems operational. Governance Brain is monitoring behavior for matrix updates."
        })

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import (
    AIQuerySession, StudentResumeInsight, PlacementTrendInsight,
    AIChatConversation, AIChatMessage, LLMInteraction
)
from .serializers import (
    AIQuerySessionSerializer, StudentResumeInsightSerializer, PlacementTrendInsightSerializer,
    AIChatConversationSerializer, AIChatMessageSerializer
)
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.auip_institution.permissions import IsTenantStudent, IsTenantAdmin
from apps.identity.utils.response_utils import success_response, error_response

class AIIntelligenceViewSet(viewsets.ViewSet):
    """
    Custom ViewSet for AI-powered intelligence services.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]

    def _get_profile_id(self, user):
        """Unified ID resolution: Registry ID for students/faculty, Auth ID for admins."""
        from apps.identity.models import User as GlobalUser
        if isinstance(user, GlobalUser):
             return user.id
        if hasattr(user, 'role'):
            if user.role == "STUDENT":
                return user.academic_ref.id if user.academic_ref else user.id
            if user.role == "FACULTY":
                return user.academic_ref.id if user.academic_ref else user.id
        return user.id

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def ask_ai(self, request):
        """
        Main entry point for AI queries. Supports persistence in specific conversations.
        """
        import logging
        logger = logging.getLogger(__name__)
        from django_tenants.utils import schema_context
        from django.db import connection
        
        # 1. Detect Schema
        schema = getattr(request.tenant, 'schema_name', None)
        if not schema and isinstance(request.auth, dict):
            schema = request.auth.get('schema')
        
        if not schema or schema == 'public':
            schema = connection.schema_name or 'public'

        try:
            with schema_context(schema):
                query_text = request.data.get('query')
                context_type = request.data.get('context', 'CAREER')
                conversation_id = request.data.get('conversation_id')
                
                if not query_text:
                    return error_response("Query text is required.")

                from apps.core_brain.services import BrainOrchestrator
                
                # Fetch conversation history if ID provided
                history = []
                conversation = None
                
                # Role-based identification
                u_id = self._get_profile_id(request.user)
                u_role = getattr(request.user, 'role', 'UNKNOWN')
                student = getattr(request.user, 'academic_ref', None)

                if conversation_id:
                    try:
                        conversation = AIChatConversation.objects.get(id=conversation_id, user_id=u_id, user_role=u_role)
                        recent_msgs = conversation.messages.order_by('-created_at')[:10]
                        for m in reversed(list(recent_msgs)):
                            history.append({"role": m.role, "content": m.content})
                    except AIChatConversation.DoesNotExist:
                        pass # Fallback to empty history

                ai_response = BrainOrchestrator.get_llm_guidance(
                    user=request.user,
                    query=query_text,
                    context_type=context_type
                )
                
                # Persist Contextually
                try:
                    # Legacy Log (Student only)
                    if student:
                        LLMInteraction.objects.create(
                            student=student,
                            prompt=query_text,
                            response=ai_response
                        )
                    
                    # New Role-Based Conversation Log (Generic)
                    if not conversation:
                            conversation = AIChatConversation.objects.create(
                                user_id=u_id,
                                user_role=u_role,
                                student=student,
                                title=query_text[:60],
                                context_type=context_type
                            )
                    
                    if conversation:
                        AIChatMessage.objects.create(
                            conversation=conversation,
                            role='user',
                            content=query_text
                        )
                        AIChatMessage.objects.create(
                            conversation=conversation,
                            role='assistant',
                            content=ai_response
                        )
                        conversation.save() # Update updated_at
                except Exception as sess_e:
                    logger.warning(f"[AI-PERSISTENCE-ERROR] {sess_e}")
                
                return success_response("AI inquiry complete", data={
                    "response": ai_response,
                    "conversation_id": conversation.id if conversation else None
                })
        except Exception as e:
            logger.error(f"[AI-INTELLIGENCE-ERROR] Failed to process AI query for user {request.user.email}. Error: {str(e)}", exc_info=True)
            return error_response(f"AI Service Error: {str(e)}", code=500)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def conversations(self, request):
        """List all chat threads for the student."""
        from django_tenants.utils import schema_context
        schema = getattr(request.tenant, 'schema_name', 'public')
        
        with schema_context(schema):
            u_id = self._get_profile_id(request.user)
            u_role = getattr(request.user, 'role', 'UNKNOWN')
            
            qs = AIChatConversation.objects.filter(user_id=u_id, user_role=u_role).order_by('-updated_at')
            serializer = AIChatConversationSerializer(qs, many=True)
            return success_response("Conversations retrieved", data=serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def messages(self, request):
        """Get messages for a specific conversation."""
        from django_tenants.utils import schema_context
        schema = getattr(request.tenant, 'schema_name', 'public')
        conversation_id = request.query_params.get('conversation_id')
        
        if not conversation_id:
            return error_response("conversation_id required")

        with schema_context(schema):
            u_id = self._get_profile_id(request.user)
            u_role = getattr(request.user, 'role', 'UNKNOWN')
            try:
                conversation = AIChatConversation.objects.get(id=conversation_id, user_id=u_id, user_role=u_role)
                msgs = conversation.messages.all().order_by('created_at')
                serializer = AIChatMessageSerializer(msgs, many=True)
                return success_response("Messages retrieved", data=serializer.data)
            except AIChatConversation.DoesNotExist:
                return error_response("Conversation not found", code=404)

    @action(detail=False, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def delete_conversation(self, request):
        from django_tenants.utils import schema_context
        schema = getattr(request.tenant, 'schema_name', 'public')
        conversation_id = request.data.get('conversation_id')
        
        with schema_context(schema):
            u_id = self._get_profile_id(request.user)
            u_role = getattr(request.user, 'role', 'UNKNOWN')
            AIChatConversation.objects.filter(id=conversation_id, user_id=u_id, user_role=u_role).delete()
            return success_response("Conversation deleted")

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def history(self, request):
        """LEGACY: Retrieves past AI interactions."""
        # This keeps the floating assistant working until we upgrade it
        from django_tenants.utils import schema_context
        schema = getattr(request.tenant, 'schema_name', 'public')
        with schema_context(schema):
            student = getattr(request.user, 'academic_ref', None)
            if not student: return success_response("No history", data=[])
            
            history_qs = LLMInteraction.objects.filter(student=student).order_by('-created_at')[:30]
            messages = []
            for h in reversed(list(history_qs)):
                messages.append({'role': 'user', 'text': h.prompt})
                messages.append({'role': 'ai', 'text': h.response})
            return success_response("History retrieved", data=messages)

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

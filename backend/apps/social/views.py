from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SocialPost, Connection, ChatSession, SupportTicket
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response
import uuid

class SocialFeedViewSet(viewsets.ModelViewSet):
    """
    Handles student social page, following, and posts.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = SocialPost.objects.all().order_by('-created_at')

    @action(detail=False, methods=['post'])
    def follow(self, request):
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        
        Connection.objects.get_or_create(
            follower_id=request.user.id,
            follower_role=getattr(request.user, 'role', 'STUDENT'),
            following_id=target_id,
            following_role=target_role
        )
        return success_response("Successfully followed.")

    @action(detail=False, methods=['get'])
    def get_profile(self, request):
        user_id = request.query_params.get('user_id')
        role = request.query_params.get('role', 'STUDENT')
        
        # In a real tenant system, we'd lookup AuthorizedAccount
        # and their recent social activity
        posts = SocialPost.objects.filter(author_id=user_id, author_role=role)
        
        # Simple summary
        return success_response("Profile retrieved", data={
            "user_id": user_id,
            "role": role,
            "recent_posts": posts.count(),
            "last_activity": posts.first().created_at if posts.exists() else None
        })

class SupportViewSet(viewsets.ModelViewSet):
    """
    Automated bug fixes and issue self-healing hub.
    """
    authentication_classes = [TenantAuthentication]
    queryset = SupportTicket.objects.all()

    def perform_create(self, serializer):
        # Auto-diagnose on create
        ticket = serializer.save()
        from apps.core_brain.services import SelfHealingSupportService
        SelfHealingSupportService.auto_diagnose(ticket.id)

class ChatViewSet(viewsets.ViewSet):
    """
    Orchestrates live chat sessions.
    """
    authentication_classes = [TenantAuthentication]

    @action(detail=False, methods=['post'])
    def start_chat(self, request):
        other_user_id = request.data.get('user_id')
        other_user_role = request.data.get('role', 'STUDENT')
        
        # Create unique session for WebRTC orchestration
        session_id = str(uuid.uuid4())
        participants = [
            {"id": request.user.id, "role": getattr(request.user, "role", "STUDENT")},
            {"id": other_user_id, "role": other_user_role}
        ]
        
        chat = ChatSession.objects.create(
            session_id=session_id,
            participants=participants
        )
        
        return success_response("Chat session initialized.", data={"session_id": session_id})

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SocialPost, SocialLike, SocialComment, Connection, ChatSession, SupportTicket
from .serializers import SocialPostSerializer, SocialCommentSerializer, SupportTicketSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response
import uuid

class SocialFeedViewSet(viewsets.ModelViewSet):
    """
    Handles institutional professional hub, following, and posts.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = SocialPost.objects.all().order_by('-created_at')
    serializer_class = SocialPostSerializer

    def perform_create(self, serializer):
        author_name = f"{self.request.user.first_name} {self.request.user.last_name}"
        serializer.save(
            author_id=self.request.user.id,
            author_role=self.request.user.role,
            author_name=author_name
        )

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        like, created = SocialLike.objects.get_or_create(
            post=post,
            user_id=request.user.id,
            user_role=request.user.role
        )
        if not created:
            like.delete()
            post.likes_count = max(0, post.likes_count - 1)
            post.save()
            return success_response("Post unliked", data={"likes": post.likes_count})
        
        post.likes_count += 1
        post.save()
        return success_response("Post liked", data={"likes": post.likes_count})

    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        post = self.get_object()
        content = request.data.get('content')
        if not content:
            return error_response("Comment content required.")
            
        comment = SocialComment.objects.create(
            post=post,
            user_id=request.user.id,
            user_role=request.user.role,
            user_name=request.user.full_name if hasattr(request.user, 'full_name') else f"{request.user.first_name} {request.user.last_name}",
            content=content
        )
        post.comments_count += 1
        post.save()
        
        return success_response("Comment added", data={"comment_id": comment.id})

    @action(detail=False, methods=['get'])
    def discover(self, request):
        from apps.auip_institution.models import StudentAcademicRegistry
        search = request.query_params.get('search', '')
        qs = StudentAcademicRegistry.objects.all()
        if search:
            qs = qs.filter(full_name__icontains=search)
        data = [{"id": s.id, "name": s.full_name, "role": "STUDENT", "avatar": s.full_name[0]} for s in qs[:20]]
        return success_response("Discovery list retrieved", data=data)

    @action(detail=False, methods=['post'])
    def follow(self, request):
        target_id = request.data.get('target_id')
        target_role = request.data.get('target_role', 'STUDENT')
        
        Connection.objects.get_or_create(
            follower_id=request.user.id,
            follower_role=request.user.role,
            following_id=target_id,
            following_role=target_role
        )
        return success_response("Successfully followed.")

class SupportViewSet(viewsets.ModelViewSet):
    """
    Automated bug fixes and issue self-healing hub.
    """
    authentication_classes = [TenantAuthentication]
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer

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

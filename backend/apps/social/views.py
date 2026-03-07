from django.db import models
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from .models import SocialPost, SocialLike, SocialComment
from .serializers import SocialPostSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from .utils import get_profile_id

class SocialFeedViewSet(viewsets.ModelViewSet):
    """
    Handles institutional professional hub, following, and posts.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = SocialPost.objects.all().order_by('-created_at')
    serializer_class = SocialPostSerializer

    def perform_create(self, serializer):
        user = self.request.user
        first = getattr(user, 'first_name', '')
        last = getattr(user, 'last_name', '')
        author_name = f"{first} {last}".strip() or user.email
        
        serializer.save(
            author_id=user.id,
            author_role=getattr(user, 'role', 'STUDENT'),
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
            
        user = request.user
        first = getattr(user, 'first_name', '')
        last = getattr(user, 'last_name', '')
        user_name = f"{first} {last}".strip() or user.email

        comment = SocialComment.objects.create(
            post=post,
            user_id=request.user.id,
            user_role=request.user.role,
            user_name=user_name,
            content=content
        )
        post.comments_count += 1
        post.save()
        
        return success_response("Comment added", data={"comment_id": comment.id})

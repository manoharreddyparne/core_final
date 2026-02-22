from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.notifications.models import Notification, Announcement
from apps.notifications.serializers import NotificationSerializer, AnnouncementSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response
from django_tenants.utils import schema_context
import logging

logger = logging.getLogger(__name__)

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for individual user notifications.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', '') == 'SUPER_ADMIN':
            return Notification.objects.none()
            
        # Resolve Public User ID from current Tenant Identity (linked by email)
        from apps.identity.models import User
        user_obj = None
        
        # SafeJWTAuthentication sets user without email in some cases? No, user is from token.
        email = getattr(user, 'email', None)
        if not email:
            return Notification.objects.none()

        with schema_context('public'):
            user_obj = User.objects.filter(email=email).first()
            
        if user_obj:
            return Notification.objects.filter(recipient_id=user_obj.id).order_by('-created_at')
            
        return Notification.objects.none()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return success_response("Notifications retrieved", data=serializer.data)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return success_response("Notification marked as read")

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return success_response("All notifications marked as read")

class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Announcements (Centralized Platform Messaging).
    Admins: CRUD
    Students/Faculty: Read-only
    """
    authentication_classes = [TenantAuthentication]
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from apps.auip_institution.permissions import IsTenantAdmin
            return [IsTenantAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Isolation handled by TenantAuthentication
        return Announcement.objects.all().order_by('-created_at')

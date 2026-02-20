from rest_framework import serializers
from apps.notifications.models import Notification, Announcement

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for individual notifications.
    """
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read', 'created_at', 'link_url']

class AnnouncementSerializer(serializers.ModelSerializer):
    """
    Serializer for group announcements.
    """
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'target_group', 'drive_id', 'importance', 'created_at']

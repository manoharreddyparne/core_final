from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, AnnouncementViewSet

router = DefaultRouter()
router.register(r'my-alerts', NotificationViewSet, basename='my-notifications')
router.register(r'announcements', AnnouncementViewSet, basename='announcements')

urlpatterns = [
    path('', include(router.urls)),
]

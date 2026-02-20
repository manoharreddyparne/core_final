from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SocialFeedViewSet, SupportViewSet, ChatViewSet

router = DefaultRouter()
router.register(r'feed', SocialFeedViewSet, basename='social-feed')
router.register(r'support', SupportViewSet, basename='social-support')
router.register(r'chat', ChatViewSet, basename='social-chat')

urlpatterns = [
    path('', include(router.urls)),
]

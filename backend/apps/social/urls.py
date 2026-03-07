from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SocialFeedViewSet
from .views_support import SupportViewSet
from .views_chat import ChatViewSet
from .views_network import NetworkViewSet

router = DefaultRouter()
router.register(r'feed', SocialFeedViewSet, basename='social-feed')
router.register(r'support', SupportViewSet, basename='social-support')
router.register(r'chat', ChatViewSet, basename='social-chat')
router.register(r'network', NetworkViewSet, basename='social-network')

urlpatterns = [
    path('', include(router.urls)),
]

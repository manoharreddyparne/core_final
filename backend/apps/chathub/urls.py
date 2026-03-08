from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SessionViewSet, MessageViewSet, ParticipantViewSet, InviteViewSet, BroadcastViewSet
from .views.network import NetworkViewSet

router = DefaultRouter()
router.register('sessions', SessionViewSet, basename='chat-sessions')
router.register('messages', MessageViewSet, basename='chat-messages')
router.register('participants', ParticipantViewSet, basename='chat-participants')
router.register('invites', InviteViewSet, basename='chat-invites')
router.register('broadcast', BroadcastViewSet, basename='chat-broadcast')
router.register('network', NetworkViewSet, basename='chat-network')

urlpatterns = [
    path('', include(router.urls)),
]

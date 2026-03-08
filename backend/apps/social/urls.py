from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.feed import SocialFeedViewSet
from .views.support import SupportViewSet

router = DefaultRouter()
router.register(r'feed', SocialFeedViewSet, basename='social-feed')
router.register(r'support', SupportViewSet, basename='social-support')

urlpatterns = [
    path('', include(router.urls)),
]

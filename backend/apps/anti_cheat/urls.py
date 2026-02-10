from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AntiCheatLogViewSet

router = DefaultRouter()
router.register('anti-cheat', AntiCheatLogViewSet, basename='anti-cheat')

urlpatterns = [
    path('', include(router.urls)),
]

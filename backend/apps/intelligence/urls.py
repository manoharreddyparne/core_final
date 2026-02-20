from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AIIntelligenceViewSet, ResumeInsightViewSet, PlacementTrendViewSet, StudentDashboardViewSet

router = DefaultRouter()
router.register(r'assistant', AIIntelligenceViewSet, basename='ai-assistant')
router.register(r'resume-insights', ResumeInsightViewSet, basename='ai-resume')
router.register(r'placement-trends', PlacementTrendViewSet, basename='ai-trends')
router.register(r'dashboard', StudentDashboardViewSet, basename='ai-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]

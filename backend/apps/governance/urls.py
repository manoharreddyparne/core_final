from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    IntelligenceProfileViewSet, 
    GovernancePolicyViewSet,
    BlogViewSet,
    NewsletterViewSet,
    DocumentTemplateViewSet
)

router = DefaultRouter()
router.register(r'profile', IntelligenceProfileViewSet, basename='governance-profile')
router.register(r'policies', GovernancePolicyViewSet, basename='governance-policy')
router.register(r'blogs', BlogViewSet, basename='governance-blog')
router.register(r'newsletters', NewsletterViewSet, basename='governance-newsletter')
router.register(r'templates', DocumentTemplateViewSet, basename='governance-template')

urlpatterns = [
    path('', include(router.urls)),
]

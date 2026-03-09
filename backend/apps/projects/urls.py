from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentProjectViewSet

router = DefaultRouter()
router.register(r'showcase', StudentProjectViewSet, basename='project-showcase')

urlpatterns = [
    path('', include(router.urls)),
]

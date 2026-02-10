# courses/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseViewSet, BatchViewSet

app_name = "courses"

router = DefaultRouter()
router.register(r"courses", CourseViewSet, basename="courses")
router.register(r"batches", BatchViewSet, basename="batches")

urlpatterns = [
    path("", include(router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.placement.views import PlacementDriveViewSet, PlacementApplicationViewSet

router = DefaultRouter()
router.register(r'drives', PlacementDriveViewSet, basename='placement-drive')
router.register(r'applications', PlacementApplicationViewSet, basename='placement-application')

urlpatterns = [
    path('', include(router.urls)),
]

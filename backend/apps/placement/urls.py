from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.placement.views import PlacementDriveViewSet, PlacementApplicationViewSet, PlacementAnalyticsSummaryView

router = DefaultRouter()
router.register(r'drives', PlacementDriveViewSet, basename='placement-drive')
router.register(r'applications', PlacementApplicationViewSet, basename='placement-application')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/summary/', PlacementAnalyticsSummaryView.as_view(), name='placement-analytics-summary'),
]

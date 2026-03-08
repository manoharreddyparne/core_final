from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from django.core.cache import cache
from apps.placement.models import PlacementDrive
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication
from apps.identity.utils.response_utils import success_response, error_response

class BroadcastViewSet(viewsets.ViewSet):
    """
    Point 10 & 11: Dedicated logic for monitoring broadcast orchestration.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Standardized progress polling for any broadcast type (Drive/Alerts)."""
        # In this context pk is the drive_id or task_id
        progress = cache.get(f"broadcast_progress_{pk}")
        if progress:
            return success_response("Neural flow status retrieved.", data=progress)
            
        # Fallback to DB state
        try:
            drive = PlacementDrive.objects.get(id=pk)
            if drive.is_broadcasted:
                return success_response("Done", data={
                    "status": "done", "percentage": 100, "message": "Broadcast signal completed."
                })
        except: pass
        
        return success_response("Idle", data={
            "status": "idle", "percentage": 0, "message": "Waiting for orchestrator..."
        })

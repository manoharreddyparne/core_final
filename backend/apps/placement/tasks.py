import logging
from celery import shared_task
from django_tenants.utils import schema_context
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def broadcast_placement_drive_task(self, drive_id, schema_name, mode='INITIAL'):
    """
    Background task to broadcast placement invitations with real-time progress.
    Now includes group chat link early in the sequence.
    """
    from apps.placement.models import PlacementDrive
    from apps.placement.services.eligibility_engine import EligibilityEngine
    from django.core.cache import cache
    
    print(f"[BROADCAST-TASK] ====== STARTED drive_id={drive_id} schema={schema_name} ======", flush=True)
    
    channel_layer = get_channel_layer()
    group_name = f"placement_broadcast_{drive_id}"
    cache_key = f"broadcast_progress_{drive_id}"
    
    # INITIAL PROGRESS
    cache.set(cache_key, {
        "type": "broadcast_status",
        "status": "processing",
        "percentage": 0,
        "current": 0,
        "total": 0,
        "message": "Initializing recruitment sequence..."
    }, timeout=600)
    
    def _update_progress(data):
        try:
            cache.set(cache_key, data, timeout=600)
        except: pass
        try:
            async_to_sync(channel_layer.group_send)(group_name, data)
            drive.save(update_fields=['is_broadcasted', 'updated_at'])
            
            _update_progress({
                "type": "broadcast_status",
                "status": "done",
                "percentage": 100,
                "current": total,
                "total": total,
                "message": "Broadcast orchestration successful!"
            })
            return f"Processed {total} students"

        except Exception as e:
            logger.error(f"[TASK-ERR] {e}", exc_info=True)
            _update_progress({"type": "broadcast_status", "status": "error", "percentage": 0, "message": f"Mission failed: {str(e)}"})
            raise

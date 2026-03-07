import logging
from celery import shared_task
from django_tenants.utils import schema_context
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time

logger = logging.getLogger(__name__)

@shared_task(bind=True)
def broadcast_placement_drive_task(self, drive_id, schema_name):
    """
    Background task to broadcast placement invitations with real-time progress.
    """
    from apps.placement.models import PlacementDrive
    from apps.placement.services.eligibility_engine import EligibilityEngine
    
    print(f"[BROADCAST-TASK] ====== STARTED drive_id={drive_id} schema={schema_name} ======", flush=True)
    
    channel_layer = get_channel_layer()
    group_name = f"placement_broadcast_{drive_id}"
    
    from django.core.cache import cache
    cache_key = f"broadcast_progress_{drive_id}"
    
    # 🏁 INITIAL PROGRESS: Set immediately so frontend poller sees it instantly
    cache.set(cache_key, {
        "type": "broadcast_status",
        "status": "processing",
        "percentage": 0,
        "current": 0,
        "total": 0,
        "message": "Orchestrating recruitment sequence..."
    }, timeout=600)
    
    def _update_progress(data):
        """Push progress via both channel layer AND cache (HTTP fallback)."""
        try:
            cache.set(cache_key, data, timeout=600)  # 10 min TTL
            print(f"[BROADCAST-TASK] Cache SET OK: {data.get('percentage', '?')}% - {data.get('message', '')}", flush=True)
        except Exception as ce:
            print(f"[BROADCAST-TASK] ❌ Cache SET FAILED: {ce}", flush=True)
        try:
            async_to_sync(channel_layer.group_send)(group_name, data)
        except Exception as e:
            logger.warning(f"[BROADCAST-WS-SEND] group_send failed: {e}")
    
    with schema_context(schema_name):
        try:
            from django.conf import settings
            is_debug = getattr(settings, 'DEBUG', False)
            
            print(f"[BROADCAST-TASK] Schema context entered. Fetching drive {drive_id}...", flush=True)
            
            drive = PlacementDrive.objects.get(id=drive_id)
            print(f"[BROADCAST-TASK] Drive found: {drive.company_name} - {drive.role}", flush=True)
            
            qualified_qs = EligibilityEngine.get_qualified_students_qs(drive)
            total = qualified_qs.count()
            
            print(f"[BROADCAST-TASK] {total} qualified students found", flush=True)
            
            if total == 0:
                _update_progress({"type": "broadcast_status", "status": "done", "percentage": 100, "current": 0, "total": 0, "message": "No eligible students found."})
                return "No students found"

            # Pre-calc active status map for active/inactive split
            from apps.auip_institution.models import StudentAuthorizedAccount
            active_account_map = {}
            for acct in StudentAuthorizedAccount.objects.filter(academic_ref__in=qualified_qs).select_related('academic_ref'):
                active_account_map[acct.academic_ref_id] = acct

            processed = 0
            start_time = time.time()
            
            # Using chunked iterator for memory efficiency
            for registry in qualified_qs.iterator(chunk_size=100):
                processed += 1
                acct = active_account_map.get(registry.id)
                is_active = bool(acct and acct.is_active)
                
                # Send the unified professional email to both official and personal IDs
                print(f"[BROADCAST-TASK] [{processed}/{total}] Emailing {registry.full_name} ({registry.roll_number}) active={is_active}", flush=True)
                EligibilityEngine.send_unified_placement_alert(drive, registry, is_active)
                
                # Push progress update via WebSockets every 5 students or at the end
                if processed % 5 == 0 or processed == total:
                    elapsed = time.time() - start_time
                    avg_time = elapsed / processed
                    remaining = (total - processed) * avg_time
                    percentage = int((processed / total) * 100)
                    
                    _update_progress({
                        "type": "broadcast_status",
                        "status": "processing",
                        "percentage": percentage,
                        "current": processed,
                        "total": total,
                        "time_left": int(remaining),
                        "message": f"Sending to {registry.full_name}..."
                    })

            # Mark drive as broadcasted
            drive.is_broadcasted = True
            
            # Create group chat
            group_info = EligibilityEngine._create_drive_group(drive, qualified_qs)
            drive.chat_session_id = group_info.get('session_id')
            drive.save(update_fields=['is_broadcasted', 'chat_session_id', 'updated_at'])
            
            # Final Success
            _update_progress({
                "type": "broadcast_status",
                "status": "done",
                "percentage": 100,
                "current": total,
                "total": total,
                "message": "Broadcast complete!"
            })
            
            print(f"[BROADCAST-TASK] ====== COMPLETED. {total} students processed ======", flush=True)
            return f"Processed {total} students"

        except Exception as e:
            print(f"[BROADCAST-TASK] ❌ EXCEPTION: {e}", flush=True)
            import traceback
            traceback.print_exc()
            logger.error(f"[BROADCAST-TASK-ERR] Drive {drive_id}: {str(e)}", exc_info=True)
            _update_progress({"type": "broadcast_status", "status": "error", "percentage": 0, "message": f"Broadcast failed: {str(e)}"})
            raise

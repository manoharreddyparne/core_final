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
        except Exception as e:
            logger.warning(f"[WS-ERR] {e}")
    
    with schema_context(schema_name):
        try:
            drive = PlacementDrive.objects.get(id=drive_id)
            qualified_qs = EligibilityEngine.get_qualified_students_qs(drive)
            
            # --- REMINDER MODE FILTER ---
            if mode == 'REMINDER':
                from apps.placement.models import PlacementApplication
                applied_ids = list(PlacementApplication.objects.filter(drive=drive).values_list('student_id', flat=True))
                qualified_qs = qualified_qs.exclude(id__in=applied_ids)
            
            total = qualified_qs.count()
            if total == 0:
                _update_progress({"type": "broadcast_status", "status": "done", "percentage": 100, "current": 0, "total": 0, "message": "Broadcast complete (No students found)."})
                return "No students"

            # 1. PRE-CREATE GROUP CHAT (So we can include link in emails)
            _update_progress({
                "type": "broadcast_status", "status": "processing", "percentage": 5, 
                "message": "Provisioning secure collaboration hub..."
            })
            group_info = EligibilityEngine._create_drive_group(drive, qualified_qs)
            drive.chat_session_id = group_info.get('session_id')
            drive.save(update_fields=['chat_session_id', 'updated_at'])
            chat_link = group_info.get('invite_link')

            # 2. EMAIL BROADCAST
            from apps.auip_institution.models import StudentAuthorizedAccount
            active_account_map = {}
            for acct in StudentAuthorizedAccount.objects.filter(academic_ref__in=qualified_qs).select_related('academic_ref'):
                active_account_map[acct.academic_ref_id] = acct

            processed = 0
            start_time = time.time()
            
            for registry in qualified_qs.iterator(chunk_size=100):
                processed += 1
                acct = active_account_map.get(registry.id)
                is_active = acct is not None and getattr(acct, 'is_active', False)
                
                # Send email
                EligibilityEngine.send_unified_placement_alert(drive, registry, is_active, chat_link=chat_link)
                
                if total < 50: time.sleep(0.3) # Fast flow visual

                if processed % 5 == 0 or processed == total:
                    elapsed = time.time() - start_time
                    avg_time = elapsed / processed
                    remaining = (total - processed) * avg_time
                    percentage = 10 + int((processed / total) * 85) # 10% to 95%
                    
                    _update_progress({
                        "type": "broadcast_status",
                        "status": "processing",
                        "percentage": percentage,
                        "current": processed,
                        "total": total,
                        "time_left": int(remaining),
                        "message": f"Broadcasting to {registry.full_name}..."
                    })

            # 3. FINALIZATION
            drive.is_broadcasted = True
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

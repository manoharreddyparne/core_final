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
    from apps.auip_institution.models import StudentAuthorizedAccount
    from django.core.cache import cache
    
    print(f"[BROADCAST-TASK] ====== STARTED drive_id={drive_id} schema={schema_name} mode={mode} ======", flush=True)
    
    channel_layer = get_channel_layer()
    group_name = f"placement_broadcast_{drive_id}"
    cache_key = f"broadcast_progress_{drive_id}"
    
    with schema_context(schema_name):
        try:
            drive = PlacementDrive.objects.get(id=drive_id)
            
            def _update_progress(pct, current, total, msg):
                data = {
                    "type": "broadcast_status",
                    "status": "processing",
                    "percentage": pct,
                    "current": current,
                    "total": total,
                    "message": msg
                }
                cache.set(cache_key, data, timeout=600)
                try:
                    async_to_sync(channel_layer.group_send)(group_name, data)
                except: pass

            # 1. Provision recruitment hub
            _update_progress(5, 0, 0, "Provisioning Recruitment Hub...")
            hub_result = EligibilityEngine.provision_recruitment_hub(drive)
            chat_link = hub_result.get('invite_link', '')
            
            if not drive.chat_session_id:
                drive.chat_session_id = hub_result.get('session_id')
                drive.save(update_fields=['chat_session_id'])
            
            # 2. Identify qualified students
            _update_progress(10, 0, 0, f"Indexing candidates (mode={mode})...")
            students = EligibilityEngine.get_qualified_students_qs(drive)
            
            if mode == 'REMINDER':
                from apps.placement.models import PlacementApplication
                from apps.auip_institution.models import StudentAuthorizedAccount
                applied_ids = PlacementApplication.objects.filter(drive=drive).values_list('student_id', flat=True)
                active_refs = StudentAuthorizedAccount.objects.filter(is_active=True).values_list('academic_ref_id', flat=True)
                students = students.filter(id__in=active_refs).exclude(id__in=applied_ids)
            elif mode == 'INACTIVE_ONLY':
                from apps.auip_institution.models import StudentAuthorizedAccount
                active_refs = StudentAuthorizedAccount.objects.filter(is_active=True).values_list('academic_ref_id', flat=True)
                students = students.exclude(id__in=active_refs)
                
            total = students.count()
            
            if total == 0:
                 _update_progress(100, 0, 0, "No eligible students found in registry.")
                 drive.is_broadcasted = True
                 drive.save()
                 return "No students matched criteria."

            # 3. Get activation status map
            active_stu_ids = set(
                StudentAuthorizedAccount.objects.filter(
                    academic_ref__in=students, is_active=True
                ).values_list('academic_ref_id', flat=True)
            )

            # 4. Broadcast loop — use persistent SMTP connection
            from django.core.mail import get_connection
            current = 0
            smtp_conn = None
            try:
                smtp_conn = get_connection(fail_silently=True)
                smtp_conn.open()
            except Exception as e:
                logger.warning(f"[BROADCAST] Could not open persistent SMTP: {e}")
                smtp_conn = None
            
            for reg in students:
                current += 1
                is_active = reg.id in active_stu_ids
                
                try:
                    EligibilityEngine.send_unified_placement_alert(
                        drive=drive, 
                        registry=reg, 
                        is_active=is_active,
                        chat_link=chat_link,
                        smtp_connection=smtp_conn
                    )
                except Exception as e:
                    logger.error(f"Failed to send to {reg.roll_number}: {e}")

                if current % 3 == 0 or current == total:
                    pct = 10 + int((current / total) * 85)
                    _update_progress(pct, current, total, f"Broadcasting alert to {reg.full_name}...")
            
            # Close persistent connection
            if smtp_conn:
                try:
                    smtp_conn.close()
                except: pass

            # 5. Finalize
            drive.is_broadcasted = True
            drive.save()
            
            final_data = {
                "type": "broadcast_status",
                "status": "done",
                "percentage": 100,
                "current": total,
                "total": total,
                "message": "Broadcast orchestration successful!"
            }
            cache.set(cache_key, final_data, timeout=600)
            try:
                async_to_sync(channel_layer.group_send)(group_name, final_data)
            except: pass
            
            return f"Processed {total} students"

        except Exception as e:
            logger.error(f"[TASK-ERR] {e}", exc_info=True)
            error_data = {
                "type": "broadcast_status", 
                "status": "error", 
                "percentage": 0, 
                "message": f"Mission failed: {str(e)}"
            }
            cache.set(cache_key, error_data, timeout=600)
            try:
                async_to_sync(channel_layer.group_send)(group_name, error_data)
            except: pass
            raise

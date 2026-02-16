import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.identity.models.institution import Institution

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Institution)
def broadcast_institution_change(sender, instance, created, **kwargs):
    """
    Broadcast institution registration or status update to Super Admins.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    action = "registration" if created else "update"
    
    # Payload for the frontend
    # We include basic info so the UI can update the list or trigger a local refresh
    data = {
        "id": instance.id,
        "name": instance.name,
        "slug": instance.slug,
        "status": instance.status,
        "action_type": action,
        "domain": instance.domain
    }

    try:
        async_to_sync(channel_layer.group_send)(
            "superadmin_updates",
            {
                "type": "institution_update",
                "data": data
            }
        )
        logger.info(f"[WS-Broadcast] Institution {action} for {instance.name}")
    except Exception as e:
        logger.error(f"Failed to broadcast institution change: {e}")

@receiver(post_delete, sender=Institution)
def broadcast_institution_deletion(sender, instance, **kwargs):
    """
    Notify Super Admins when an institution is deleted.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    try:
        async_to_sync(channel_layer.group_send)(
            "superadmin_updates",
            {
                "type": "institution_update",
                "data": {
                    "id": instance.id,
                    "slug": instance.slug,
                    "action_type": "deletion"
                }
            }
        )
        logger.info(f"[WS-Broadcast] Institution deletion for {instance.name}")
    except Exception as e:
        logger.error(f"Failed to broadcast institution deletion: {e}")

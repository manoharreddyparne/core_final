import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

class PlacementBroadcastConsumer(AsyncWebsocketConsumer):
    """
    Handles real-time progress streaming for recruitment broadcasts.
    Group Name: placement_broadcast_[drive_id]
    NOTE: Does NOT require authentication — progress is not sensitive data.
    """
    async def connect(self):
        self.drive_id = self.scope['url_route']['kwargs'].get('drive_id')
        if not self.drive_id:
            logger.warning("[PLACEMENT-WS] Connection rejected — no drive_id in URL")
            await self.close()
            return
            
        self.group_name = f"placement_broadcast_{self.drive_id}"
        
        # Accept and join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        has_user = self.scope.get('user') is not None
        logger.info(f"[PLACEMENT-WS] Connected. Group={self.group_name} Authenticated={has_user}")

    async def disconnect(self, close_code):
        logger.info(f"[PLACEMENT-WS] Disconnected. Group={getattr(self, 'group_name', '?')} Code={close_code}")
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def broadcast_status(self, event):
        """
        Receives updates from the Celery task and sends to the UI.
        Event format: {
            "type": "broadcast_status",
            "status": "processing"|"done"|"error",
            "percentage": 0-100,
            "current": N,
            "total": N,
            "time_left": seconds,
            "message": "..."
        }
        """
        logger.debug(f"[PLACEMENT-WS] Forwarding: status={event.get('status')} pct={event.get('percentage')}%")
        await self.send(text_data=json.dumps(event))


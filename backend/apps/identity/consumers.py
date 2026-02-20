# users/consumers.py

import json
import logging
from typing import Optional
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async, async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


class SessionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer to manage user sessions:
    - Notifies of logout, token rotation, new login, and live location.
    - Supports 'logout all other devices' feature.
    - Each device joins group 'user_sessions_<user_id>'.
    """

    async def connect(self):
        self.user = self.scope.get("user")
        self.session_id = self.scope.get("session_id")  # front-end should send this in scope

        if not self.user or not self.user.is_authenticated:
            await self.close()
            logger.debug("WS connection rejected: unauthenticated user")
            return

        # 🚀 Role-based Group Isolation
        # This prevents Super Admin and Institutional Admin (sharing same email)
        # from kicking each other out via WebSocket events.
        role = "anonymous"
        payload = self.scope.get("token_payload")
        if payload:
            role = payload.get("role") or getattr(self.user, 'role', 'anonymous')
        
        self.group_name = f"user_sessions_{self.user.id}_{role}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # 🚀 REAL-TIME HUB: Add Super Admins to the broadcast group
        if self.user.role == "SUPER_ADMIN":
            self.broadcast_group = "superadmin_updates"
            await self.channel_layer.group_add(self.broadcast_group, self.channel_name)
            logger.info(f"Super Admin {self.user.email} joined real-time institutional hub.")

        await self.accept()
        logger.debug(f"WS connected for user_id={self.user.id} | session_id={self.session_id}")

    async def disconnect(self, close_code: int):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        
        # 🚀 REAL-TIME HUB: Clean up broadcast group
        if hasattr(self, "broadcast_group"):
            await self.channel_layer.group_discard(self.broadcast_group, self.channel_name)
            
        logger.debug(f"WS disconnected user_id={getattr(self.user,'id', None)} | code={close_code}")

    async def institution_update(self, event: dict):
        """Relay institution updates to the Super Admin UI."""
        try:
            await self.send(text_data=json.dumps({
                "action": "institution_update",
                "data": event.get("data", {})
            }))
        except Exception as e:
            logger.warning(f"Failed to relay institution update: {e}")

    async def receive(self, text_data: Optional[str] = None, bytes_data: Optional[bytes] = None):
        """Handle messages from client."""
        if not text_data:
            return

        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "update_location":
                jti = data.get("jti")
                latitude = data.get("latitude")
                longitude = data.get("longitude")
                if jti and latitude is not None and longitude is not None:
                    await self.update_session_location(jti, latitude, longitude)

            elif action == "logout_current":
                jti = data.get("jti")
                if jti:
                    await self.force_logout(jti)

            elif action == "logout_others":
                origin_jti = data.get("jti")
                if origin_jti:
                    await self.logout_other_devices(origin_jti)

        except Exception as e:
            logger.exception(f"WS receive error user_id={getattr(self.user,'id', None)}: {e}")

    async def session_update(self, event: dict):
        """Push session updates to client."""
        data = event.get("data", {})

        # Skip event if it originated from this session (for "logout all other devices")
        if data.get("origin_session_id") == self.session_id:
            return

        try:
            await self.send(text_data=json.dumps(data))
        except Exception as e:
            logger.warning(f"Failed to send WS message to user_id={self.user.id}: {e}")

    @sync_to_async
    def update_session_location(self, jti: str, latitude: float, longitude: float):
        """Update LoginSession with live location and broadcast."""
        try:
            from apps.identity.models.core_models import User
            from apps.identity.models.auth_models import LoginSession
            from django.db.models import Q
            
            # Multi-tenant aware session lookup
            if hasattr(self.user, 'role') and self.user.role in ('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'):
                 schema = self.scope.get("token_payload", {}).get("schema", "")
                 session = LoginSession.objects.filter(tenant_user_id=self.user.id, tenant_schema=schema, jti=jti, is_active=True).first()
            else:
                 session = LoginSession.objects.filter(user=self.user, jti=jti, is_active=True).first()

            if session:
                session.latitude = latitude
                session.longitude = longitude
                session.save(update_fields=["latitude", "longitude"])
                logger.debug(f"Updated location for session {jti} | user_id={self.user.id}")

                self._broadcast_to_group({
                    "action": "location_update",
                    "session_id": session.id,
                    "latitude": latitude,
                    "longitude": longitude
                })
        except Exception as e:
            logger.exception(f"Failed to update session location jti={jti} user_id={self.user.id}: {e}")

    @sync_to_async
    def force_logout(self, jti: str):
        """Force logout of a specific session."""
        try:
            from apps.identity.models.core_models import User
            from apps.identity.models.auth_models import LoginSession
            # Multi-tenant aware session lookup
            if hasattr(self.user, 'role') and self.user.role in ('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'):
                 schema = self.scope.get("token_payload", {}).get("schema", "")
                 session = LoginSession.objects.filter(tenant_user_id=self.user.id, tenant_schema=schema, jti=jti, is_active=True).first()
            else:
                 session = LoginSession.objects.filter(user=self.user, jti=jti, is_active=True).first()

            if session:
                session.is_active = False
                session.save(update_fields=["is_active"])
                logger.info(f"Forced logout session {jti} | user_id={self.user.id}")

                self._broadcast_to_group({
                    "action": "force_logout",
                    "session_id": session.id,
                    "jti": session.jti,
                    "reason": "terminated_by_admin"
                })
        except Exception as e:
            logger.exception(f"Failed to force logout jti={jti} user_id={self.user.id}: {e}")

    @sync_to_async
    def logout_other_devices(self, origin_jti: str):
        """Logout all sessions except origin_jti."""
        try:
            from apps.identity.models.core_models import User
            from apps.identity.models.auth_models import LoginSession
            # Multi-tenant aware session lookup
            if hasattr(self.user, 'role') and self.user.role in ('STUDENT', 'FACULTY', 'INSTITUTION_ADMIN'):
                 schema = self.scope.get("token_payload", {}).get("schema", "")
                 other_sessions = LoginSession.objects.filter(tenant_user_id=self.user.id, tenant_schema=schema, is_active=True).exclude(jti=origin_jti)
            else:
                 other_sessions = LoginSession.objects.filter(user=self.user, is_active=True).exclude(jti=origin_jti)

            for session in other_sessions:
                session.is_active = False
                session.save(update_fields=["is_active"])
                logger.info(f"Logged out other session {session.jti} | user_id={self.user.id}")

                self._broadcast_to_group({
                    "action": "force_logout",
                    "session_id": session.id,
                    "jti": session.jti,
                    "origin_session_id": origin_jti,
                    "reason": "terminated_by_other_device"
                })
        except Exception as e:
            logger.exception(f"Failed to logout other devices for user_id={self.user.id}: {e}")

    def _broadcast_to_group(self, data: dict):
        """Helper to send WS events to the user's group safely."""
        try:
            if hasattr(self, "group_name"):
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        self.group_name,
                        {"type": "session_update", "data": data}
                    )
        except Exception as e:
            logger.warning(f"Failed to broadcast WS event for user_id={self.user.id}: {e}")

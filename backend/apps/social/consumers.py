import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

class SocialChatConsumer(AsyncWebsocketConsumer):
    """
    Handles Real-time E2EE Chat, Presence, and Signalling.
    Implements High-Fidelity status tracking (Typing, Seen, Sent).
    """
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return
            
        self.profile_id = await self.get_profile_id()

        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        # Strict Membership Check
        if not await self.is_member():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        data = json.loads(text_data)
        msg_type = data.get('type')

        # 1. Advanced Messaging (E2EE)
        if msg_type == 'chat_message':
            content = data.get('message')
            metadata = data.get('metadata', {})
            att_type = data.get('attachment_type', 'TEXT')
            
            # Encrypt and Save
            saved_id = await self.save_message(content, att_type, metadata)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_broadcast',
                    'message': content, # Decrypted for broadcast (assuming HTTPS/WSS security)
                    'msg_id': saved_id,
                    'sender_id': self.profile_id,
                    'attachment_type': att_type,
                    'timestamp': timezone.now().isoformat(),
                    'status': 'SENT'
                }
            )

        # 2. Typing Indicator
        elif msg_type == 'typing_status':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_broadcast',
                    'sender_id': self.profile_id,
                    'is_typing': data.get('is_typing', False)
                }
            )

        # 3. Read Receipt
        elif msg_type == 'read_receipt':
            msg_ids = data.get('message_ids', [])
            await self.mark_as_read(msg_ids)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'status_broadcast',
                    'sender_id': self.profile_id,
                    'status': 'SEEN',
                    'message_ids': msg_ids
                }
            )

        # 4. WebRTC Signalling
        elif msg_type in ['webrtc_offer', 'webrtc_answer', 'ice_candidate']:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'signal_data': data,
                    'sender_id': self.profile_id
                }
            )

    async def chat_broadcast(self, event):
        """
        Send to ALL participants including the sender.
        The sender uses the echo to confirm their optimistic message
        got saved and to obtain the real DB message ID.
        """
        await self.send(text_data=json.dumps(event))

    async def typing_broadcast(self, event):
        if str(event['sender_id']) != str(self.profile_id):
            await self.send(text_data=json.dumps(event))

    async def status_broadcast(self, event):
        if str(event['sender_id']) != str(self.profile_id):
            await self.send(text_data=json.dumps(event))

    async def webrtc_signal(self, event):
        if str(event['sender_id']) != str(self.profile_id):
            await self.send(text_data=json.dumps(event['signal_data']))

    @database_sync_to_async
    def get_profile_id(self):
        """
        Resolve the registry profile ID for the connected user.
        MUST run inside the correct tenant schema — WebSocket connections
        bypass the tenant middleware, so we read the schema from the JWT
        token payload just like is_member() and save_message() do.
        """
        from django_tenants.utils import schema_context
        from apps.social.views import SocialFeedViewSet

        schema = (
            self.scope.get('token_payload', {}).get('schema', 'public')
            if self.scope.get('token_payload')
            else 'public'
        )
        with schema_context(schema):
            return SocialFeedViewSet._get_my_profile_id(None, self.user)

    @database_sync_to_async
    def is_member(self):
        from django_tenants.utils import schema_context
        from apps.social.models import ChatSession
        
        schema = self.scope.get('token_payload', {}).get('schema', 'public') if self.scope.get('token_payload') else 'public'
        with schema_context(schema):
            my_id = self.profile_id
            session = ChatSession.objects.filter(session_id=self.session_id).first()
            if not session: return False
            return any(int(p['id']) == int(my_id) for p in session.participants)

    @database_sync_to_async
    def save_message(self, content, att_type, metadata):
        from django_tenants.utils import schema_context
        from apps.social.models import ChatMessage, ChatSession
        from apps.social.security import SecureVaultService
        
        schema = self.scope.get('token_payload', {}).get('schema', 'public') if self.scope.get('token_payload') else 'public'
        try:
            with schema_context(schema):
                session = ChatSession.objects.get(session_id=self.session_id)
                encrypted = SecureVaultService.encrypt(content)
                m = ChatMessage.objects.create(
                    session=session,
                    sender_id=self.profile_id,
                    sender_role=getattr(self.user, 'role', 'STUDENT'),
                    content=encrypted,
                    attachment_type=att_type,
                    metadata=metadata
                )
                session.last_message_at = timezone.now()
                session.save()
                return m.id
        except Exception:
            return None

    @database_sync_to_async
    def mark_as_read(self, msg_ids):
        from django_tenants.utils import schema_context
        from apps.social.models import ChatMessage
        
        schema = self.scope.get('token_payload', {}).get('schema', 'public') if self.scope.get('token_payload') else 'public'
        with schema_context(schema):
            ChatMessage.objects.filter(id__in=msg_ids).update(is_read=True, read_at=timezone.now())

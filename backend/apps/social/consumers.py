import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

class SocialChatConsumer(AsyncWebsocketConsumer):
    """
    Handles Real-time Chat and WebRTC Signalling.
    Supports 1-on-1 and Group communications.
    """
    async def connect(self):
        self.user = self.scope["user"]
        if self.user.is_anonymous:
            await self.close()
            return

        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'chat_{self.session_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')

        # 1. Standard Messaging
        if msg_type == 'chat_message':
            message = data['message']
            # Save to DB asynchronously
            await self.save_message(message)
            
            # Broadcast to group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_broadcast',
                    'message': message,
                    'sender_id': self.user.id,
                    'sender_name': self.user.email, # Fallback to email
                    'timestamp': timezone.now().isoformat()
                }
            )

        # 2. WebRTC Signalling (Offers, Answers, ICE Candidates)
        elif msg_type in ['webrtc_offer', 'webrtc_answer', 'ice_candidate']:
            # Forward the signal to other participants in the room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'signal_data': data,
                    'sender_id': self.user.id
                }
            )

    async def chat_broadcast(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def webrtc_signal(self, event):
        # Forward WebRTC signal to WebSocket (but skip the sender)
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps(event['signal_data']))

    @database_sync_to_async
    def save_message(self, content):
        from apps.social.models import ChatMessage, ChatSession
        try:
            session = ChatSession.objects.get(session_id=self.session_id)
            ChatMessage.objects.create(
                session=session,
                sender_id=self.user.id,
                sender_role=getattr(self.user, 'role', 'STUDENT'),
                content=content
            )
        except Exception:
            pass

# users/routing.py
from django.urls import re_path
from . import consumers
from .dispatch_consumer import DispatchConsumer

# Frontend connects like: ws://<host>/ws/sessions/?token=<access_token>
from apps.social import consumers as social_consumers
from apps.placement import consumers as placement_consumers

websocket_urlpatterns = [
    re_path(r"^/?ws/sessions/?$", consumers.SessionConsumer.as_asgi()),
    re_path(r"^/?ws/dispatch/?$", DispatchConsumer.as_asgi()),
    re_path(r"^/?ws/chat/(?P<session_id>[^/]+)/?$", social_consumers.SocialChatConsumer.as_asgi()),
    re_path(r"^/?ws/placement/broadcast/(?P<drive_id>[^/]+)/?$", placement_consumers.PlacementBroadcastConsumer.as_asgi()),
    re_path(r"^/?$", consumers.SessionConsumer.as_asgi()),  # Catch-all
]

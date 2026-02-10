# users/routing.py
from django.urls import re_path
from . import consumers

# Frontend connects like: ws://<host>/ws/sessions/?token=<access_token>
websocket_urlpatterns = [
    re_path(r"ws/sessions/$", consumers.SessionConsumer.as_asgi()),
    re_path(r"^$", consumers.SessionConsumer.as_asgi()),  # ✅ Catch-all for root path
]

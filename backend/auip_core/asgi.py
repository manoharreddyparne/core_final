import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.identity.middleware_jwt import JWTAuthMiddleware
import apps.identity.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")

# -------------------------------
# HTTP requests middleware
# -------------------------------
django_asgi_app = get_asgi_application()

# ------------------------------- 
# ASGI application: HTTP + WebSocket
# -------------------------------
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(apps.identity.routing.websocket_urlpatterns)
    ),
})

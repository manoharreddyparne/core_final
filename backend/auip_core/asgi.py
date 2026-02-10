import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from services.identity_access.middleware import AccessTokenSessionMiddleware
from services.identity_access.middleware_jwt import JWTAuthMiddleware
import services.identity_access.routing

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings")

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
        URLRouter(services.identity_access.routing.websocket_urlpatterns)
    ),
})

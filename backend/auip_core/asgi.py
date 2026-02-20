import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")

# Start Django ASGI application early
django_asgi_app = get_asgi_application()

# Import routing and middleware AFTER django_asgi_app to avoid AppRegistryNotReady
try:
    from apps.identity.middleware_jwt import JWTAuthMiddleware
    import apps.identity.routing
    websocket_routes = apps.identity.routing.websocket_urlpatterns
except Exception as e:
    # Fallback/Log if there's an issue during early import
    websocket_routes = []
    print(f"ASGI Load Warning: {e}")

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(websocket_routes)
    ),
})

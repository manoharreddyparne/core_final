# users/middleware_jwt.py

from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import jwt
from apps.identity.models.auth_models import LoginSession

User = get_user_model()

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

@database_sync_to_async
def validate_session(user, jti):
    """Return active LoginSession for this jti, or None."""
    if not user or not jti:
        return None
    return LoginSession.objects.filter(user=user, jti=jti, is_active=True).first()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using JWT token.
    Token must be sent as query string: ?token=<access_token>
    Sets scope["user"] and scope["session_id"] (jti)
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        qs = parse_qs(query_string)
        token = qs.get("token", [None])[0]

        scope["user"] = None
        scope["session_id"] = None
        scope["token_payload"] = None

        if token:
            try:
                payload = UntypedToken(token)
                user_id = payload.get("user_id")
                jti = payload.get("jti")  # Session ID from JWT
                user = await get_user(user_id)
                if user:
                    session = await validate_session(user, jti)
                    if session:
                        scope["user"] = user
                        scope["session_id"] = session.jti
                        scope["token_payload"] = payload
                    # else: session invalid or expired -> WS connection will be allowed but user=None
            except (InvalidToken, TokenError, jwt.DecodeError):
                # Token invalid -> scope["user"] stays None
                pass

        return await super().__call__(scope, receive, send)

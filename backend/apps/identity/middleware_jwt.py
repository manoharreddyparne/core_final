# users/middleware_jwt.py

from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import jwt


@database_sync_to_async
def get_user_tenant_aware(user_id, role, schema):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    from apps.identity.models.core_models import User
    from django_tenants.utils import schema_context
    from apps.auip_institution.models import (
        AdminAuthorizedAccount,
        FacultyAuthorizedAccount,
        StudentAuthorizedAccount,
    )

    try:
        if schema and role in ("INSTITUTION_ADMIN", "FACULTY", "STUDENT"):
            with schema_context(schema):
                if role == "INSTITUTION_ADMIN":
                    return AdminAuthorizedAccount.objects.get(id=user_id)
                elif role == "FACULTY":
                    return FacultyAuthorizedAccount.objects.get(id=user_id)
                else:
                    return StudentAuthorizedAccount.objects.get(id=user_id)
        return User.objects.get(id=user_id)
    except Exception:
        return None

@database_sync_to_async
def validate_session_tenant_aware(user, jti, schema):
    """Return active LoginSession for this jti, or None."""
    if not user or not jti:
        return None
    from apps.identity.models.auth_models import LoginSession
    from django_tenants.utils import schema_context
    with schema_context('public'):
        if schema:
            return LoginSession.objects.filter(tenant_user_id=user.id, tenant_schema=schema, jti=jti, is_active=True).first()
        return LoginSession.objects.filter(user=user, jti=jti, is_active=True).first()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using JWT token.
    Token must be sent as query string: ?token=<access_token>
    Sets scope["user"] and scope["session_id"] (jti)
    """

    async def __call__(self, scope, receive, send):
        from urllib.parse import parse_qs
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
                # v2 compatible id extraction
                tenant_user_id = payload.get("tenant_user_id")
                final_user_id = tenant_user_id if tenant_user_id else user_id
                
                jti = payload.get("jti")
                role = payload.get("role")
                schema = payload.get("schema")
                
                user = await get_user_tenant_aware(final_user_id, role, schema)
                if user:
                    session = await validate_session_tenant_aware(user, jti, schema)
                    if session:
                        scope["user"] = user
                        scope["session_id"] = session.jti
                        scope["token_payload"] = payload
            except Exception:
                pass

        return await super().__call__(scope, receive, send)

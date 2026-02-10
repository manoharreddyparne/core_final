# users/services/auth_service.py
import logging
from typing import Optional, Sequence

from django.utils import timezone

from apps.identity.serializers.auth_serializers import (
    AdminTokenObtainPairSerializer,
    CustomTokenObtainPairSerializer,
)
from apps.identity.services.token_service import create_login_session_safe
from apps.identity.models.core_models import User

logger = logging.getLogger(__name__)


def handle_login(
    user: User,
    password: str,
    ip: Optional[str],
    user_agent: Optional[str] = None,
    request=None,
    role_context: str = "student",                # "student" | "admin"
    allowed_roles: Optional[Sequence[str]] = None # dynamic override
) -> dict:
    """
    Validates credentials → issues JWT pair
    Creates DB session → tracks device
    Returns validated serializer fields
    """

    # -------------------------------------------------------
    # Pick serializer based on context
    # -------------------------------------------------------
    serializer_cls = (
        AdminTokenObtainPairSerializer
        if role_context == "admin"
        else CustomTokenObtainPairSerializer
    )

    # Optional role override
    if allowed_roles is not None:
        roles = list(allowed_roles)

        class DynamicSerializer(serializer_cls):   # type: ignore
            allowed_roles = roles

        serializer_cls = DynamicSerializer         # type: ignore

    # -------------------------------------------------------
    # Validate credentials
    # -------------------------------------------------------
    serializer = serializer_cls(
        data={
            "username": user.username,
            "password": password,
        },
        context={"request": request},
    )

    # Wrong password / wrong role → AuthenticationFailed
    serializer.is_valid(raise_exception=True)

    validated = serializer.validated_data
    access_token = validated.get("access")
    refresh_token = validated.get("refresh")

    # -------------------------------------------------------
    # Persist login traces
    # -------------------------------------------------------
    try:
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
    except Exception as e:
        logger.warning(f"[AUTH] failed to persist last_login user={user.id}: {e}")

    # -------------------------------------------------------
    # Create secure session
    # -------------------------------------------------------
    create_login_session_safe(
        user=user,
        access_token=access_token,
        refresh_token=refresh_token,
        ip=ip,
        user_agent=user_agent,
    )

    logger.info(
        f"[AUTH] ✅ user={user.id} email={user.email} "
        f"ip={ip or 'n/a'} agent={user_agent or 'n/a'} role={role_context}"
    )

    return validated

# users/services/auth_service.py
import logging
from typing import Optional, Sequence, Any

from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.serializers.auth_serializers import (
    AdminTokenObtainPairSerializer,
    CustomTokenObtainPairSerializer,
)
from apps.identity.services.token_service import create_login_session_safe
from apps.identity.models.core_models import User

logger = logging.getLogger(__name__)


def handle_login(
    identity: Any,  # User or AuthorizedAccount
    password: Optional[str],
    ip: Optional[str],
    user_agent: Optional[str] = None,
    request=None,
    role_context: str = "student",                # "student" | "admin"
    allowed_roles: Optional[Sequence[str]] = None # dynamic override
) -> dict:
    """
    ✅ Purpose:
        - Centralized hub for ALL login types (V1, V2, OTP, MFA)
        - Issues JWT pair + Quantum Shield Fragments
        - Creates DB LoginSession for tracking
    """

    # 1. Credentials Validation (if password provided)
    if password is not None:
        if isinstance(identity, User):
            serializer_cls = (
                AdminTokenObtainPairSerializer
                if role_context == "admin"
                else CustomTokenObtainPairSerializer
            )
            # Optional role override
            if allowed_roles is not None:
                roles = list(allowed_roles)
                class DynamicSerializer(serializer_cls):
                    allowed_roles = roles
                serializer_cls = DynamicSerializer

            serializer = serializer_cls(
                data={
                    "username": identity.username,
                    "password": password,
                },
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            validated = serializer.validated_data
            access_token = validated.get("access")
            refresh_token = validated.get("refresh")
        else:
            # For localized models (AuthorizedAccount), we assume password was already checked in View
            # Generative tokens for non-User objects
            refresh = RefreshToken.for_user(identity)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
    else:
        # OTP / MFA success path
        refresh = RefreshToken.for_user(identity)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

    # 2. Persist Traces (Standardized property names)
    try:
        if hasattr(identity, 'last_login'):
            identity.last_login = timezone.now()
            identity.save(update_fields=["last_login"])
        elif hasattr(identity, 'last_login_at'):
            identity.last_login_at = timezone.now()
            identity.save(update_fields=["last_login_at"])
    except Exception as e:
        logger.warning(f"[AUTH] failed to persist last_login for {identity}: {e}")

    # 3. Secure Session Creation (identity.LoginSession)
    # ⚠️ NOTE: LoginSession expects a Global User. 
    # If using AuthorizedAccount, ensure we can either link them or create a shadow User.
    # For now, we attempt to pass identity. 
    # (Refactoring of token_service.py might be needed to allow generic IDs)
    session = create_login_session_safe(
        user=identity,
        access_token=access_token,
        refresh_token=refresh_token,
        ip=ip,
        user_agent=user_agent,
    )

    # 4. Generate Quantum Shield Fragments
    from apps.identity.services.quantum_shield import QuantumShieldService
    
    parts = str(refresh_token).split('.')
    header_payload = f"{parts[0]}.{parts[1]}"
    signature = parts[2]
    mid = len(header_payload) // 2
    
    fragments = {
        QuantumShieldService.SEGMENT_T: header_payload[:mid],
        QuantumShieldService.SEGMENT_ID: str(session.id),
        QuantumShieldService.SEGMENT_P: header_payload[mid:],
        QuantumShieldService.SEGMENT_S: signature
    }

    logger.info(
        f"[AUTH] ✅ {identity.__class__.__name__} login SUCCESS "
        f"id={identity.id} ip={ip or 'n/a'} role={role_context}"
    )

    return {
        "access": access_token,
        "refresh": refresh_token,
        "fragments": fragments
    }

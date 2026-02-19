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
from apps.identity.models import User
from django.conf import settings

logger = logging.getLogger(__name__)

class TenantRefreshToken(RefreshToken):
    """
    Custom RefreshToken that bypasses simple-jwt's BlacklistMixin
    to avoid crashing on non-User identities (AuthorizedAccount).
    We rely on apps.identity.models.BlacklistedAccessToken instead.
    """
    def blacklist(self):
        # Override to do nothing, preventing OutstandingToken creation attempt
        pass
    
    @classmethod
    def for_user(cls, user):
        # Override to avoid setting current_user which triggers blacklist logic
        token = cls()
        token[settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')] = user.id
        return token


def handle_login(
    identity: Any,  # User or AuthorizedAccount
    password: Optional[str],
    ip: Optional[str],
    user_agent: Optional[str] = None,
    request=None,
    role_context: str = "student",                # "student" | "admin"
    allowed_roles: Optional[Sequence[str]] = None, # dynamic override
    custom_claims: Optional[dict] = None          # ✅ Extra claims (schema, role, etc)
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
            refresh = TenantRefreshToken.for_user(identity)
            
            # ✅ Inject custom claims if provided
            if custom_claims:
                for key, value in custom_claims.items():
                    refresh[key] = value
                    
            # ✅ MANUALLY PROPAGATE CLAIMS
            access = refresh.access_token
            for key in ['role', 'email', 'schema', 'tenant_user_id']:
                if key in refresh:
                    access[key] = refresh[key]
                    
            access_token = str(access)
            refresh_token = str(refresh)
    else:
        # OTP / MFA success path: generate tokens for the already validated identity
        if isinstance(identity, User):
            refresh = RefreshToken.for_user(identity)
            # ✅ Essential Identity Claims for Zero-Trust session restoration
            refresh['role'] = getattr(identity, 'role', 'STUDENT')
            refresh['email'] = identity.email
        else:
            refresh = TenantRefreshToken.for_user(identity)
            refresh['role'] = getattr(identity, 'role', 'STUDENT')
            refresh['email'] = getattr(identity, 'email', '')
        
        # ✅ Inject additional custom claims (schema, etc.) if provided
        if custom_claims:
            for key, value in custom_claims.items():
                refresh[key] = value
                
        # ✅ MANUALLY PROPAGATE CLAIMS: Simple-JWT doesn't copy custom claims to 
        # the access token by default when using refresh.access_token.
        access = refresh.access_token
        for key in ['role', 'email', 'schema', 'tenant_user_id']:
            if key in refresh:
                access[key] = refresh[key]
                
        access_token = str(access)
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

    # 3. Secure Session Creation
    # LoginSession.user is now nullable. For tenant-scoped logins (AdminAuthorizedAccount, etc.),
    # identity may NOT be a global User. token_service handles this by storing tenant metadata.
    # Determine effective role for WebSocket group isolation
    effective_role = role_context
    if custom_claims and custom_claims.get("role"):
        effective_role = custom_claims.get("role")
    elif hasattr(identity, 'role'):
        effective_role = identity.role

    session = create_login_session_safe(
        user=identity,
        access_token=access_token,
        refresh_token=refresh_token,
        ip=ip,
        user_agent=user_agent,
        role=effective_role,
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

    # ✅ REFRESH SECURITY REPUTATION: 
    # If login is successful, we MUST clear any global failure counts/blocks for this IP.
    from apps.identity.services.security_service import clear_global_failures
    if ip:
        clear_global_failures(ip)

    logger.info(
        f"[AUTH] ✅ {identity.__class__.__name__} login SUCCESS "
        f"id={identity.id} ip={ip or 'n/a'} role={role_context}"
    )

    return {
        "access": access_token,
        "refresh": refresh_token,
        "fragments": fragments
    }

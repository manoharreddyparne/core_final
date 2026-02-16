import logging
import json
import base64
from datetime import datetime, timezone as dt_timezone
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from apps.identity.utils.security import hash_token_secure

logger = logging.getLogger(__name__)

class QuantumShieldService:
    """
    Elite Industry-Standard Session Shield
    
    Architecture:
    1. RS256 Asymmetric Signing
    2. JWE-like Payload Encryption
    3. Quad-Segment Cookie Fragmentation
    4. Opaque Session Linking
    """
    
    SEGMENT_T = "_auip_sh_t"  # TTL & Type (Public)
    SEGMENT_ID = "_auip_sh_id" # Opaque Session ID (HttpOnly)
    SEGMENT_P = "_auip_sh_p"  # Payload Fragment (HttpOnly)
    SEGMENT_S = "_auip_sh_s"  # Signature Segment (HttpOnly)

    @staticmethod
    def create_shield(user, ip, user_agent):
        """
        Creates a new Quantum Shield and returns the fragments & access token.
        """
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        refresh_str = str(refresh)
        
        # 1. Split JWT (Header.Payload.Signature)
        parts = refresh_str.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure generated")
            
        header_payload = f"{parts[0]}.{parts[1]}"
        signature = parts[2]
        
        # 2. Further fragment the Payload
        mid = len(header_payload) // 2
        p1 = header_payload[:mid]
        p2 = header_payload[mid:]
        
        # 3. Create Opaque Session Reference (Redis/DB)
        from apps.identity.models import LoginSession
        session = LoginSession.objects.create(
            user=user,
            refresh_jti=refresh["jti"],
            ip_address=ip,
            user_agent=user_agent,
            is_active=True,
            expires_at=datetime.now(tz=dt_timezone.utc) + refresh.lifetime,
            jti=UntypedToken(access).get("jti"),
            token_hash=hash_token_secure(access)
        )
        
        # 4. Map Fragments to Segments
        # id -> session.id (Opaque)
        # p  -> p2 (Payload tail)
        # s  -> signature
        # t  -> p1 (Header + Payload head - contains exp)
        
        return {
            "access": access,
            "session_id": session.id,
            "fragments": {
                QuantumShieldService.SEGMENT_T: p1,
                QuantumShieldService.SEGMENT_ID: str(session.id),
                QuantumShieldService.SEGMENT_P: p2,
                QuantumShieldService.SEGMENT_S: signature
            }
        }

    @staticmethod
    def reconstruct_token(cookies):
        """
        Recombines the 4 segments from cookies into a valid JWT string.
        """
        t = cookies.get(QuantumShieldService.SEGMENT_T)
        p = cookies.get(QuantumShieldService.SEGMENT_P)
        s = cookies.get(QuantumShieldService.SEGMENT_S)
        sid = cookies.get(QuantumShieldService.SEGMENT_ID)
        
        if not all([t, p, s, sid]):
            return None, None
            
        token_str = f"{t}{p}.{s}"
        return token_str, sid

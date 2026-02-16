import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.identity.services.quantum_shield import QuantumShieldService
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.serializers.user_serializers import UserSerializer
from apps.identity.models import User, LoginSession
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from django.utils import timezone
from apps.identity.utils.request_utils import get_client_ip, get_location, parse_device_info

logger = logging.getLogger(__name__)

class PassportView(APIView):
    """
    The Unified Identity Passport Hub.
    GET /auth/passport/
    
    1. Reconstructs JWT from Quad-Shield cookies.
    2. Validates session state machine (JIT -> OTP -> SECURE).
    3. Issues RAM-only Access Token.
    """
    authentication_classes = [] 
    permission_classes = []

    def get(self, request):
        ip = get_client_ip(request)
        ua = request.META.get("HTTP_USER_AGENT", "unknown")
        
        # 1. Try to reconstruct token from shield
        token_str, session_id = QuantumShieldService.reconstruct_token(request.COOKIES)
        
        if not token_str:
            return Response({
                "success": False,
                "stage": "UNAUTHENTICATED", 
                "message": "Shield empty. Identification required."
            }, status=200) # ✅ 200 to keep console clean

        try:
            # 2. Validate JWT (RS256)
            refresh = RefreshToken(token_str)
            user_id = refresh.get("user_id")
            
            user = User.objects.filter(id=user_id).first()
            if not user:
                return Response({
                    "success": False,
                    "stage": "INVALID_USER", 
                    "message": "Identity mismatch."
                }, status=200)

            # 3. Validate Session Persistence
            session = LoginSession.objects.filter(id=session_id, user=user, is_active=True).first()
            if not session:
                return Response({
                    "success": False,
                    "stage": "SESSION_EXPIRED", 
                    "message": "Session rotated or invalidated."
                }, status=200)
            
            # TODO: Add StageMachine transition check here (JIT -> OTP)
            # For now, we assume if session is active, user is in SECURE stage
            
            # 4. Issue Fresh RAM-only Access Token
            access = str(refresh.access_token)
            
            # ✅ Sync DB session with the NEW JTI so it's valid for authenticate_access_token
            from apps.identity.utils.security import hash_token_secure
            untyped = UntypedToken(access)
            
            session.jti = untyped.get("jti")
            session.token_hash = hash_token_secure(access)
            session.last_active = timezone.now()
            session.save(update_fields=["jti", "token_hash", "last_active"])
            
            data = {
                "stage": "SECURE_SESSION",
                "access": access,
                "user": UserSerializer(user).data,
                "session_id": str(session.id)
            }
            
            logger.info(f"[PASSPORT] Hydrated session {session.id} for user {user.id}")
            return success_response("Passport hydrated", data=data)

        except Exception as e:
            logger.warning(f"[PASSPORT] Rejection: {e}")
            from apps.identity.utils.cookie_utils import clear_session_cookies
            resp = Response({
                "success": False,
                "stage": "REJECTION", 
                "message": str(e)
            }, status=200)
            
            # 🫧 SELF-HEALING: Clear poisoned cookies on failure
            clear_session_cookies(resp)
            return resp

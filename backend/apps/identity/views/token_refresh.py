import logging
from datetime import datetime, timezone as dt_timezone

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from users.models import LoginSession
from users.models.core_models import User
from users.services.token_service import (
    blacklist_refresh_jti,
    verify_session_fingerprint,
)
from users.utils.cookie_utils import (
    set_refresh_cookie,
    clear_refresh_cookie,
    invalidate_session,
)
from users.utils.response_utils import success_response
from users.utils.request_utils import get_client_ip

logger = logging.getLogger(__name__)


# ---------------------------------
# ✅ Silent Session Rehydration
# ---------------------------------
class SessionBootstrapView(APIView):
    """
    ✅ Session Bootstrap Flow
       - Uses refresh cookie
       - Validates session + fingerprint
       - Issues new access (does NOT replace refresh)
       - Returns { access, user, refresh_token_present }
       - NEVER forces logout unless security violation
       - Used on:
           • Page refresh
           • Access token expired
           • Tab restore
           • Offline → Online
    """
    permission_classes = []   # public endpoint — refresh cookie is auth

    def get(self, request):
        from users.utils.cookie_utils import REFRESH_COOKIE_NAME
        
        # DEBUG: Log all cookies to help diagnose cross-origin issues
        logger.info(f"[BOOTSTRAP] incoming cookies: {list(request.COOKIES.keys())}")
        
        refresh_token_str = request.COOKIES.get(REFRESH_COOKIE_NAME)
        if refresh_token_str:
             logger.info(f"[BOOTSTRAP] Received token: {refresh_token_str[:15]}...")

        if not refresh_token_str:
            # frontend sees → treat as logged-out
            return Response({"detail": f"Refresh token missing from cookies (expected '{REFRESH_COOKIE_NAME}')"}, status=401)

        ip = get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT") or "unknown"

        try:
            # Decode RT
            refresh = RefreshToken(refresh_token_str)
            refresh_jti = refresh.get("jti")
            user_id = refresh.get("user_id")

            if not refresh_jti or not user_id:
                resp = Response({"detail": "Invalid refresh"}, status=401)
                clear_refresh_cookie(resp)
                return resp

            user = User.objects.filter(id=user_id).first()
            if not user:
                resp = Response({"detail": "User not found"}, status=401)
                clear_refresh_cookie(resp)
                return resp

            # Session lookup
            session = LoginSession.objects.filter(
                user_id=user_id,
                refresh_jti=refresh_jti,
                is_active=True
            ).first()

            if not session:
                # Cleanup - safeguard
                blacklist_refresh_jti(refresh_jti, user=user)
                resp = Response({"detail": "Session inactive"}, status=401)
                clear_refresh_cookie(resp)
                return resp

            # ✅ VERIFY DEVICE — soft
            try:
                verify_session_fingerprint(session, ip, user_agent)
            except Exception:
                return invalidate_session(session)  # 401 + WS teardown

            # ✅ Generate new access
            new_access = refresh.access_token
            
            # CRITICAL: Update the session JTI to match the new access token!
            from rest_framework_simplejwt.tokens import UntypedToken
            from users.utils.security import hash_token_secure
            
            u = UntypedToken(str(new_access))
            session.jti = u.get("jti")
            session.token_hash = hash_token_secure(str(new_access))

            # Update expiration timestamp + last_active
            now = datetime.now(tz=dt_timezone.utc)
            session.expires_at = now + new_access.lifetime
            session.last_active = now
            session.save(update_fields=["expires_at", "last_active", "jti", "token_hash"])

            # ✅ Response
            # ✅ Response
            from users.serializers.user_serializers import UserSerializer
            
            data = {
                "access": str(new_access),
                "refresh_token_present": True,
                "user": UserSerializer(user).data,
            }

            resp = success_response("Session restored", data)

            # ⚠️ We DO NOT rotate refresh on bootstrap
            # Just reset cookie so expiry rolls forward
            set_refresh_cookie(resp, refresh_token_str)

            logger.info(
                f"[BOOTSTRAP] user={user.id} ip={ip} OK"
            )
            return resp

        except TokenError as e:
            logger.warning(f"[BOOTSTRAP] TokenError: {str(e)} | Token start: {refresh_token_str[:15]}...")
            resp = Response({"detail": f"Refresh token error: {str(e)}"}, status=401)
            clear_refresh_cookie(resp)
            return resp

        except User.DoesNotExist:
            logger.warning(f"[BOOTSTRAP] User not found for token.")
            resp = Response({"detail": "User not found related to token"}, status=401)
            clear_refresh_cookie(resp)
            return resp

        except Exception as e:
            logger.exception(f"[SessionBootstrapView] Unexpected error: {e}")
            resp = Response({"detail": "Server error"}, status=500)
            clear_refresh_cookie(resp)
            return resp

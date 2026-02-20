import logging
import datetime
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.identity.models import User
from apps.identity.utils.request_utils import get_client_ip, get_location, parse_device_info
from apps.identity.services.token_service import rotate_tokens_secure
from apps.identity.utils.cookie_utils import set_quantum_shield, set_logged_in_cookie
from apps.identity.services.quantum_shield import QuantumShieldService
from apps.identity.utils.response_utils import success_response

logger = logging.getLogger(__name__)

class SecureDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        jti = getattr(request, "access_jti", None)
        
        # Locate the specific LoginSession linked to this access token
        session_obj = None
        if jti:
            from apps.identity.models import LoginSession
            from apps.identity.models.core_models import User as GlobalUser
            
            if isinstance(user, GlobalUser):
                session_obj = LoginSession.objects.filter(user=user, jti=jti, is_active=True).first()
            else:
                # Tenant Isolated account
                schema = getattr(request.auth, 'get', lambda x, y: None)('schema', None)
                session_obj = LoginSession.objects.filter(tenant_user_id=user.id, tenant_schema=schema, jti=jti, is_active=True).first()

        # 1. 6-Hour Cooldown Check (DB-backed)
        if session_obj and session_obj.last_secure_check:
            if timezone.now() < session_obj.last_secure_check + datetime.timedelta(hours=6):
                ip = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                device_info = parse_device_info(user_agent)
                location = get_location(ip)
                
                return success_response(
                    "Device is already secured.",
                    data={
                        "device": device_info,
                        "location": location,
                        "secured_at": session_obj.last_secure_check.isoformat(),
                        "already_secured": True
                    }
                )

        try:
            # 2. Analyze Request
            ip = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            device_info = parse_device_info(user_agent)
            location = get_location(ip)

            # 3. Rotate Tokens (Security Best Practice)
            # Reconstruct the old refresh token from cookies to validate the rotation chain
            old_refresh, _ = QuantumShieldService.reconstruct_token(request.COOKIES)
            
            if not old_refresh:
                 logger.warning(f"Secure device failed: No refresh token found for user {user.id}")
                 return Response({
                     "success": False,
                     "message": "Session context missing. Please re-authenticate."
                 }, status=status.HTTP_401_UNAUTHORIZED)

            from rest_framework.exceptions import AuthenticationFailed
            try:
                # Resolve schema from token for correct multi-tenant context
                schema = getattr(request.auth, 'get', lambda x, y: None)('schema', None)

                # Use the robust service to rotate & fragment
                rotated = rotate_tokens_secure(
                    user=user,
                    old_refresh=old_refresh,
                    ip=ip,
                    user_agent=user_agent,
                    schema=schema
                )
            except AuthenticationFailed as ae:
                logger.warning(f"Rotation failed during secure-device: {ae}")
                return Response({
                    "success": False,
                    "message": str(ae)
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # 4. Update Session Data (DB update) — sync access JTI for SafeJWTAuthentication
            if session_obj:
                session_obj.refresh_from_db()  # Reload after rotate_tokens_secure may have updated it
                from apps.identity.utils.security import hash_token_secure
                from rest_framework_simplejwt.tokens import UntypedToken
                new_access_str = rotated["access"]
                untyped = UntypedToken(new_access_str)
                session_obj.jti = untyped.get("jti")
                session_obj.token_hash = hash_token_secure(new_access_str)
                session_obj.last_secure_check = timezone.now()
                session_obj.save(update_fields=["jti", "token_hash", "last_secure_check"])
            
            logger.info(f"Device secured for {user.email}: {device_info} at {ip}")

            resp = success_response(
                "Device secured successfully.",
                data={
                    "device": device_info,
                    "location": location,
                    "secured_at": timezone.now().isoformat(),
                    "access": rotated["access"],
                }
            )
            
            # ✅ SET QUAD-SHIELD COOKIES
            set_quantum_shield(resp, rotated["fragments"])
            set_logged_in_cookie(resp, "true", role=user.role)
            
            return resp

        except Exception as e:
            logger.exception("Secure device internal failure")
            return Response({
                "success": False,
                "message": "Failed to secure device due to an internal error."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

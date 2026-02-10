import logging
import datetime
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.identity.models import User
from apps.identity.utils.session_utils import success_response, get_location, parse_device_info
from apps.identity.utils.security import hash_token_secure
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

class SecureDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        
        # 1. 6-Hour Cooldown Check
        last_secured = request.session.get('last_secure_check')
        if last_secured:
            last_time = datetime.datetime.fromisoformat(last_secured)
            if timezone.now() < last_time + datetime.timedelta(hours=6):
                # Return data even if already secured so UI can show it
                ip = request.META.get('REMOTE_ADDR')
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                device_info = parse_device_info(user_agent)
                location = get_location(ip)
                
                return success_response(
                    "Device is already secured.",
                    data={
                        "device": device_info,
                        "location": location,
                        "secured_at": last_time.isoformat(),
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
            refresh = RefreshToken.for_user(user)
            access = str(refresh.access_token)
            
            # 4. Update Session Data (Set cooldown)
            request.session['last_secure_check'] = timezone.now().isoformat()
            
            logger.info(f"Device secured for {user.email}: {device_info} at {ip}")

            return success_response(
                "Device secured successfully.",
                data={
                    "device": device_info,
                    "location": location,
                    "secured_at": timezone.now().isoformat(),
                    "access": access, # Return new access token if rotated
                }
            )

        except Exception as e:
            logger.exception("Secure device failed")
            return success_response("Failed to secure device.", status_code=500)

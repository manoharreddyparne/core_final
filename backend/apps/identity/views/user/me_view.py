# users/views/user/me_view.py
import logging
from rest_framework import permissions
from rest_framework.views import APIView
from apps.identity.serializers.user_serializers import UserSerializer
from apps.identity.utils.response_utils import success_response
from apps.identity.authentication import SafeJWTAuthentication

logger = logging.getLogger(__name__)

class MeView(APIView):
    """
    Endpoint to fetch the currently authenticated user's basic info.
    Permissions: Authenticated users only.
    """
    authentication_classes = [SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return success_response("Current user fetched", serializer.data)

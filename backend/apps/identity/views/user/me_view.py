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
        user = request.user
        
        # Determine serializer based on Identity Type
        from apps.auip_institution.models import StudentAuthorizedAccount, FacultyAuthorizedAccount, AdminAuthorizedAccount
        from apps.identity.serializers.user_serializers import StudentMeSerializer
        from apps.identity.models import User
        
        if isinstance(user, StudentAuthorizedAccount):
            serializer = StudentMeSerializer(user)
        elif isinstance(user, (FacultyAuthorizedAccount, AdminAuthorizedAccount)):
            # Fallback for Faculty/TenantAdmins - we can expand this later
            serializer = UserSerializer(user)
        else:
            # Global SuperAdmin / Admin
            serializer = UserSerializer(user)
            
        return success_response("Current profile hydrated", serializer.data)

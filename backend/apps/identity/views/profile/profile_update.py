# users/views/profile/profile_update.py
import logging
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from apps.identity.models import User
from apps.identity.serializers.user_serializers import (
    UserUpdateSerializer,
    StudentProfileUpdateSerializer,
    TeacherProfileUpdateSerializer,
)
from apps.identity.utils.response_utils import success_response, error_response

logger = logging.getLogger(__name__)

class ProfileUpdateView(APIView):
    """
    Handles partial updates to user profile info:
    - Name, avatar, other basic info
    - Role-specific fields (student: roll_number, batch; teacher: department, subjects)
    - Does NOT handle sensitive fields like passwords or roles
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def patch(self, request):
        user = request.user
        data = request.data.copy()  # avoid mutation

        from apps.identity.models.core_models import User

        try:
            # 🛡️ SECURITY: Student Read-Only Enforcement
            if getattr(user, 'role', None) == "STUDENT":
                return error_response(
                    "Academic Identity Protection: Profile updates are restricted for students. Contact registrar for correction.", 
                    code=403
                )

            is_global_user = isinstance(user, User)

            if is_global_user:
                # ✅ Super Admin (Global Django User) — use standard serializer
                serializer = UserUpdateSerializer(user, data=data, partial=True)

                if serializer.is_valid():
                    serializer.save()
                    logger.info(f"[ProfileUpdateView] Global user {user.id} ({user.email}) updated profile.")
                    return success_response("Profile updated successfully.", data=serializer.data)

                return error_response("Invalid profile data.", errors=serializer.errors)

            else:
                # ✅ Localized Tenant User (AdminAuthorizedAccount, FacultyAuthorizedAccount, etc.)
                # These models live in tenant schemas — must switch context before saving.
                schema = None
                if hasattr(request, 'auth') and request.auth:
                    schema = request.auth.get('schema') if isinstance(request.auth, dict) else getattr(request.auth, 'get', lambda x, y: None)('schema', None)
                
                if not schema:
                    # Try to get from JWT payload
                    from rest_framework_simplejwt.tokens import UntypedToken
                    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                    if auth_header.startswith('Bearer '):
                        try:
                            token = UntypedToken(auth_header.split(' ')[1])
                            schema = token.get('schema')
                        except Exception:
                            pass

                updated_fields = []
                
                # Only allow safe fields for tenant accounts
                allowed_fields = ['first_name', 'last_name']
                for field_name in allowed_fields:
                    if field_name in data:
                        if hasattr(user, field_name):
                            setattr(user, field_name, data[field_name])
                            updated_fields.append(field_name)

                if updated_fields:
                    if schema:
                        from django_tenants.utils import schema_context
                        with schema_context(schema):
                            user.save(update_fields=updated_fields)
                    else:
                        user.save(update_fields=updated_fields)
                    
                    logger.info(f"[ProfileUpdateView] Tenant user {user.id} ({user.email}) updated: {updated_fields} in schema={schema}")
                    return success_response("Profile updated successfully.", data={f: getattr(user, f) for f in updated_fields})
                
                return success_response("No changes detected.", data={})

        except Exception as e:
            logger.exception(f"[ProfileUpdateView] Update failed for user {getattr(user, 'id', '?')}: {type(e).__name__}: {e}")
            return error_response(f"Failed to update profile: {type(e).__name__}: {e}", code=500)

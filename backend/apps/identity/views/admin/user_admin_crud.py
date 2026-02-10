# users/views/admin/user_admin_crud.py
import logging
from rest_framework import permissions, viewsets
from apps.identity.models import User
from apps.identity.serializers.user_serializers import UserSerializer

from apps.identity.permissions import IsAdminRole

logger = logging.getLogger(__name__)


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    Admin CRUD for users.
    - Permissions: Admin only
    - Supports filtering by username, email, and role
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        username = self.request.query_params.get("username")
        email = self.request.query_params.get("email")
        role = self.request.query_params.get("role")

        if username:
            qs = qs.filter(username__icontains=username)
        if email:
            qs = qs.filter(email__icontains=email)
        if role:
            qs = qs.filter(role__iexact=role)

        return qs

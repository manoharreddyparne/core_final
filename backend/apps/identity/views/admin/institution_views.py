"""
Institution Management Views - Super Admin only
"""

import logging
from rest_framework import viewsets, permissions, status
from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.identity.serializers.core_serializers import serializers
from apps.identity.permissions import IsSuperAdmin
from apps.identity.utils.response_utils import success_response

logger = logging.getLogger(__name__)

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = '__all__'

class InstitutionViewSet(viewsets.ModelViewSet):
    """
    Super Admin:
      Manage institutions / universities.
    """
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [IsSuperAdmin]
    lookup_field = 'slug'

    def perform_create(self, serializer):
        institution = serializer.save()
        logger.info(f"[Institution-Create] slug={institution.slug}")

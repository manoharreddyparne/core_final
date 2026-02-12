"""
Institution Management Views - Super Admin only
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.identity.serializers.core_serializers import serializers
from apps.identity.permissions import IsSuperAdmin
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.multitenancy import create_institution_schema, schema_context
from apps.auip_institution.models import PreSeededRegistry

logger = logging.getLogger(__name__)

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = '__all__'

class InstitutionViewSet(viewsets.ModelViewSet):
    """
    Super Admin:
      Manage institutions / universities with full lifecycle support.
    """
    queryset = Institution.objects.all()
    serializer_class = InstitutionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
    lookup_field = 'slug'

    def perform_create(self, serializer):
        institution = serializer.save()
        logger.info(f"[Institution-Create] slug={institution.slug}")

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        institution = self.get_object()
        
        # Generate schema name based on slug if not present
        if not institution.schema_name:
            institution.schema_name = f"inst_{institution.slug.replace('-', '_')}"
        
        try:
            # Create dynamic schema
            created = create_institution_schema(institution.schema_name)
            if created:
                logger.info(f"[Multi-Tenancy] Created schema {institution.schema_name} for {institution.name}")
            
            # Trigger Seed Logic: Populate PreSeededRegistry from registration data
            reg_data = institution.registration_data or {}
            initial_users = reg_data.get("initial_users", []) # Expect list of {identifier, email, role}
            
            with schema_context(institution.schema_name):
                # Always create at least one admin from the contact email if registry is empty
                if not initial_users:
                    PreSeededRegistry.objects.get_or_create(
                        identifier=institution.contact_email,
                        defaults={
                            "email": institution.contact_email,
                            "role": "ADMIN"
                        }
                    )
                else:
                    for user in initial_users:
                        PreSeededRegistry.objects.get_or_create(
                            identifier=user.get("identifier"),
                            defaults={
                                "email": user.get("email"),
                                "role": user.get("role", "STUDENT")
                            }
                        )

            logger.info(f"[Institution-Approval] APPROVED, SCHEMA CREATED, and SEEDED: {institution.name}")
            return success_response({"message": f"Institution {institution.name} approved and isolated schema created successfully."})
        except Exception as e:
            logger.error(f"[Institution-Approval] Failed to approve {institution.name}: {str(e)}")
            return error_response(f"Failed to create isolated environment for {institution.name}.")

    @action(detail=True, methods=['post'])
    def reject(self, request, slug=None):
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.REJECTED
        institution.save()
        
        # TODO: Trigger Email notification to institution
        
        logger.info(f"[Institution-Approval] REJECTED: {institution.name}")
        return success_response({"message": f"Institution {institution.name} rejected."})

    @action(detail=True, methods=['post'])
    def mark_review(self, request, slug=None):
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.REVIEW
        institution.save()
        return success_response({"message": f"Institution {institution.name} marked for review."})

    @action(detail=True, methods=['post'])
    def request_info(self, request, slug=None):
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.MORE_INFO
        institution.save()
        
        # TODO: Send email asking for more details
        
        return success_response({"message": "Requested more information from the institution."})

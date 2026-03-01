"""
Institution Management Views - Super Admin only
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.identity.models.core_models import User
from apps.identity.serializers.core_serializers import serializers
from apps.identity.permissions import IsSuperAdmin
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.utils.multitenancy import create_institution_schema
from apps.identity.utils.activation import generate_activation_token, get_activation_url
from django_tenants.utils import schema_context

logger = logging.getLogger(__name__)

class InstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_slug(self, value):
        if not value:
            raise serializers.ValidationError("Slug cannot be empty.")
        return value

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
        from django.utils.text import slugify
        name = serializer.validated_data.get('name')
        slug = serializer.validated_data.get('slug')
        
        if not slug and name:
            slug = slugify(name)
            # Basic uniqueness check
            base_slug = slug
            counter = 1
            while Institution.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
        
        institution = serializer.save(slug=slug)
        logger.info(f"[Institution-Create] slug={institution.slug}")

    @action(detail=True, methods=['post'])
    def approve(self, request, slug=None):
        institution = self.get_object()
        
        # Generate schema name based on slug if not present
        if not institution.schema_name:
            institution.schema_name = f"inst_{institution.slug.replace('-', '_')}"
            institution.save(update_fields=['schema_name'])
        
        try:
            # 1. Pre-check: Duplicate Email Constraint
            existing_user = User.objects.filter(email__iexact=institution.contact_email).first()
            if existing_user and existing_user.role == User.Roles.INSTITUTION_ADMIN:
                profile = InstitutionAdmin.objects.filter(user=existing_user).exclude(institution=institution).first()
                if profile:
                    return error_response(
                        f"The email {institution.contact_email} is already registered as an admin for {profile.institution.name}. Duplicate admin emails across different institutions are not permitted.",
                        code=status.HTTP_400_BAD_REQUEST
                    )

            # 2. Trigger ASYNCHRONOUS Provisioning via Celery
            # This returns immediately to the frontend, preventing timeouts.
            # Progress is streamed back via WebSockets.
            from apps.identity.tasks import provision_institution_task
            provision_institution_task.delay(institution.id)

            logger.info(f"[Institution-Approval] Provisioning task queued for {institution.name} (Schema: {institution.schema_name or 'TBD'})")

            return success_response({
                "message": f"Provisioning started for {institution.name}. You can track progress in real-time.",
                "status": "PROVISIONING_STARTED"
            }, code=status.HTTP_202_ACCEPTED)
        except Exception as e:
            logger.error(f"[Institution-Approval] Failed to approve {institution.name}: {str(e)}", exc_info=True)
            return error_response(
                f"Failed to create isolated environment for {institution.name}.",
                errors={"detail": str(e)}
            )

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
    def grant_access(self, request, slug=None):
        """
        Special action to instantly restore access for a revoked institution.
        Skips formal approval/migration flow to provide a faster UX for admins.
        """
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.APPROVED
        institution.is_active = True
        institution.save()
        
        logger.info(f"[Institution-Grant] Access restored for: {institution.name}")
        return success_response({"message": f"Access granted to {institution.name}."})

    @action(detail=False, methods=['post'], url_path='rebuild-slugs')
    def rebuild_slugs(self, request):
        """
        Emergency action to fix institutions with missing slugs causing 404s.
        """
        from django.utils.text import slugify
        institutions = Institution.objects.filter(slug='') | Institution.objects.filter(slug__isnull=True)
        count = 0
        fixed = []
        
        for inst in institutions:
            new_slug = slugify(inst.name)
            base_slug = new_slug
            counter = 1
            while Institution.objects.filter(slug=new_slug).exclude(id=inst.id).exists():
                new_slug = f"{base_slug}-{counter}"
                counter += 1
            
            inst.slug = new_slug
            inst.save()
            fixed.append({"id": inst.id, "name": inst.name, "slug": inst.slug})
            count += 1
            
        logger.warning(f"[Institution-SlugFix] Rebuilt {count} slugs for legacy records.")
        return success_response({
            "message": f"Successfully rebuilt {count} slugs.",
            "fixed": fixed
        })

    @action(detail=True, methods=['post'])
    def request_info(self, request, slug=None):
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.MORE_INFO
        institution.save()
        
        # TODO: Send email asking for more details
        
        return success_response({"message": "Requested more information from the institution."})

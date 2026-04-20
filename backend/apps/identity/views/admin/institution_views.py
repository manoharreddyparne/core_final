"""
Institution Management Views - Super Admin only
"""

import logging
import time
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.identity.models.institution import Institution, InstitutionAdmin, SchemaUpdateHistory
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
    lookup_url_kwarg = 'slug'

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

    def destroy(self, request, *args, **kwargs):
        """
        Delete the institution and its associated data.
        """
        instance = self.get_object()
        slug = instance.slug
        from apps.identity.utils.multitenancy import delete_institution_data
        success, msg = delete_institution_data(slug)
        if success:
            return success_response(f"Institution {slug} and all data has been deleted.")
        return error_response(f"Deletion failed: {msg}")

    @action(detail=True, methods=['post'], url_path='delete_institution', url_name='delete_institution')
    def delete_institution(self, request, *args, **kwargs):
        """
        Manual deletion of institution data.
        """
        instance = self.get_object()
        slug = instance.slug
        from apps.identity.utils.multitenancy import delete_institution_data
        success, msg = delete_institution_data(slug)
        if success:
            return success_response(f"Environment for {slug} has been deleted.")
        return error_response(f"Deletion failed: {msg}")

    @action(detail=True, methods=['post'], url_path='approve', url_name='approve')
    def approve(self, request, *args, **kwargs):
        institution = self.get_object()
        
        # 0. Check if already complete or in progress
        if institution.status == Institution.RegistrationStatus.APPROVED and institution.is_setup_complete:
            return success_response({"message": "Institution is already approved and setup."})
            
        if institution.status == Institution.RegistrationStatus.PROVISIONING:
            return success_response({
                "message": "Provisioning is already in progress. Resuming tracking...",
                "status": "PROVISIONING_STARTED"
            }, code=status.HTTP_202_ACCEPTED)

        # Generate schema name based on slug if not present
        if not institution.schema_name:
            institution.schema_name = f"inst_{institution.slug.replace('-', '_')}"
            institution.save(update_fields=['schema_name'])
        
        try:
            # 1. Conflict Check: Duplicate Domain (Across all institutions)
            # Find any other institution with the same domain that is already approved
            domain_conflict = Institution.objects.filter(
                domain__iexact=institution.domain
            ).exclude(id=institution.id).filter(status=Institution.RegistrationStatus.APPROVED).first()
            
            if domain_conflict:
                return error_response(
                    f"Conflict detected: The domain '{institution.domain}' is already verified and owned by {domain_conflict.name}. "
                    f"A single domain cannot be assigned to multiple institutions."
                )

            # 2. Conflict Check: Duplicate Admin Email
            existing_user = User.objects.filter(email__iexact=institution.contact_email).first()
            if existing_user:
                # If they are a superadmin or have multiple profiles, we allow it UNLESS they are already an admin of another APPROVED institution
                profile = InstitutionAdmin.objects.filter(user=existing_user).exclude(institution=institution).first()
                if profile and profile.institution.status == Institution.RegistrationStatus.APPROVED:
                    return error_response(
                        f"Conflict detected: {institution.contact_email} is already the primary administrator for {profile.institution.name}. "
                        f"Institutional administrators must have unique email identities for security isolation."
                    )

            # 3. Mark as Provisioning
            institution.status = Institution.RegistrationStatus.PROVISIONING
            institution.save(update_fields=['status'])

            # 4. Trigger ASYNCHRONOUS Provisioning via Celery
            from apps.identity.tasks import provision_institution_task
            provision_institution_task.delay(institution.id)

            logger.info(f"[Institution-Approval] Provisioning task queued for {institution.name} (Schema: {institution.schema_name})")

            return success_response({
                "message": f"Provisioning started for {institution.name}. You can track progress in real-time.",
                "status": "PROVISIONING_STARTED"
            }, code=status.HTTP_202_ACCEPTED)
        except Exception as e:
            institution.status = Institution.RegistrationStatus.PENDING
            institution.save(update_fields=['status'])
            logger.error(f"[Institution-Approval] Failed to approve {institution.name}: {str(e)}", exc_info=True)
            return error_response(
                f"Failed to create isolated environment for {institution.name}.",
                errors={"detail": str(e)}
            )

    @action(detail=True, methods=['post'], url_path='sync_schema', url_name='sync_schema')
    def sync_schema(self, request, *args, **kwargs):
        """
        Force-sync migrations for a specific institution's schema.
        Records history for audit trail.
        """
        institution = self.get_object()
        schema_name = institution.schema_name
        
        if not schema_name:
            return error_response("Institution has no associated database schema.")

        from django.core.management import call_command
        from apps.identity.utils.multitenancy import get_schema_sync_status
        from io import StringIO
        from django.utils import timezone
        
        # Check what needs syncing BEFORE
        from apps.identity.utils.multitenancy import get_schema_sync_status_detailed, repair_missing_tables, UnifiedProvisioningTracker, WSProgressStream
        status_info = get_schema_sync_status_detailed(schema_name)
        
        needs_sync = not status_info.get("is_current", True)
        missing_tables = status_info.get("missing_tables", [])
        
        if not needs_sync and not missing_tables:
            return success_response(
                "Schema is already up to date.",
                data={
                    "status": "ALREADY_CURRENT",
                    "is_current": True,
                    "migrations_applied": 0
                }
            )

        # Get version number
        existing_count = SchemaUpdateHistory.objects.filter(institution=institution).count()
        version_label = f"v{existing_count + 1}"
        
        # Create history record
        history = SchemaUpdateHistory.objects.create(
            institution=institution,
            schema_name=schema_name,
            version_label=version_label,
            triggered_by=request.user if request.user.is_authenticated else None,
            status=SchemaUpdateHistory.UpdateStatus.IN_PROGRESS
        )
        
        start_time = time.time()
        from apps.identity.tasks import sync_schema_task
        sync_schema_task.delay(institution.id, request.user.id if request.user.is_authenticated else None)
        
        return success_response(
            f"Synchronization initiated for {schema_name}.",
            data={
                "status": "SYNC_STARTED",
                "schema_name": schema_name
            },
            code=status.HTTP_202_ACCEPTED
        )

    @action(detail=True, methods=['get'], url_path='verify_schema', url_name='verify_schema')
    def verify_schema(self, request, *args, **kwargs):
        """
        Check if the institution's schema is up to date with the latest code changes.
        Returns detailed info about what's missing.
        """
        institution = self.get_object()
        schema_name = institution.schema_name
        
        if not schema_name:
            return success_response("No schema associated.", data={
                "is_up_to_date": True,
                "is_current": True,
                "pending_count": 0,
                "missing_updates": 0,
                "details": [],
                "status_code": "UP_TO_DATE"
            })

        from apps.identity.utils.multitenancy import get_schema_sync_status_detailed
        result = get_schema_sync_status_detailed(schema_name)
        
        return success_response("Schema verification complete.", data=result)

    @action(detail=False, methods=['post'], url_path='sync_all_schemas', url_name='sync_all_schemas')
    def sync_all_schemas(self, request, *args, **kwargs):
        """
        Global Operation: Runs migrations across ALL institutions.
        """
        from apps.identity.tasks import sync_all_schemas_task
        try:
            logger.warning("[Schema-Sync] GLOBAL: Triggering platform-wide schema synchronization.")
            sync_all_schemas_task.delay()
            return success_response(
                "Global schema synchronization initiated.",
                data={"status": "GLOBAL_SYNC_SUCCESS"},
                code=status.HTTP_202_ACCEPTED
            )
        except Exception as e:
            logger.error(f"[Schema-Sync] Global sync trigger failed: {e}")
            return error_response(f"Global synchronization failed to queue: {str(e)}")

    @action(detail=False, methods=['get'], url_path='schema_health', url_name='schema_health')
    def schema_health(self, request, *args, **kwargs):
        """
        Return sync status for ALL approved institutions.
        Used by the Super Admin Schema Health Dashboard.
        """
        from apps.identity.utils.multitenancy import get_schema_sync_status_detailed, get_migration_loader
        
        loader = get_migration_loader()
        
        approved = Institution.objects.filter(
            status=Institution.RegistrationStatus.APPROVED,
            schema_name__isnull=False
        ).exclude(schema_name='')
        
        results = []
        for inst in approved:
            try:
                sync_info = get_schema_sync_status_detailed(inst.schema_name, loader=loader)
                last_update = SchemaUpdateHistory.objects.filter(
                    institution=inst, status='SUCCESS'
                ).first()
                
                results.append({
                    "id": inst.id,
                    "name": inst.name,
                    "slug": inst.slug,
                    "schema_name": inst.schema_name,
                    "is_current": sync_info.get("is_current", True),
                    "pending_count": sync_info.get("pending_count", 0),
                    "pending_migrations": sync_info.get("pending_migrations", []),
                    "status_code": sync_info.get("status_code", "UP_TO_DATE"),
                    "missing_tables_count": sync_info.get("missing_tables_count", 0),
                    "missing_tables": sync_info.get("missing_tables", []),
                    "last_update": {
                        "version": last_update.version_label if last_update else None,
                        "date": last_update.completed_at.isoformat() if last_update and last_update.completed_at else None,
                        "duration": last_update.duration_seconds if last_update else None,
                    } if last_update else None
                })
            except Exception as e:
                results.append({
                    "id": inst.id,
                    "name": inst.name,
                    "slug": inst.slug,
                    "schema_name": inst.schema_name,
                    "is_current": False,
                    "pending_count": -1,
                    "error": str(e)
                })
        
        total = len(results)
        outdated = sum(1 for r in results if not r.get("is_current", True))
        
        health_data = {
            "summary": {
                "total_institutions": total,
                "up_to_date": total - outdated,
                "needs_update": outdated
            },
            "institutions": results
        }
        return success_response("Global schema health analysis complete.", data=health_data)

    @action(detail=True, methods=['get'], url_path='schema_update_history', url_name='schema_update_history')
    def schema_update_history(self, request, *args, **kwargs):
        """
        Get the update history for a specific institution's schema.
        """
        institution = self.get_object()
        histories = SchemaUpdateHistory.objects.filter(institution=institution).select_related('triggered_by')[:20]
        
        data = []
        for h in histories:
            data.append({
                "id": h.id,
                "version_label": h.version_label,
                "status": h.status,
                "migrations_count": h.migrations_count,
                "migrations_applied": h.migrations_applied,
                "started_at": h.started_at.isoformat() if h.started_at else None,
                "completed_at": h.completed_at.isoformat() if h.completed_at else None,
                "duration_seconds": h.duration_seconds,
                "triggered_by": h.triggered_by.email if h.triggered_by else "System",
                "error_message": h.error_message if h.status == 'FAILED' else None
            })
        
        return success_response(data)

    @action(detail=True, methods=['post'], url_path='abort', url_name='abort')
    def abort(self, request, slug=None):
        """
        Emergency stop for a hung or failed provisioning attempt.
        """
        institution = self.get_object()
        if institution.status != Institution.RegistrationStatus.PROVISIONING:
             return error_response("Can only abort institutions currently in 'PROVISIONING' state.")

        schema_name = institution.schema_name
        if not schema_name:
             return error_response("No schema found to abort.")

        from apps.identity.tasks import abort_provisioning_task
        abort_provisioning_task.delay(schema_name)
        
        # Reset status
        institution.status = Institution.RegistrationStatus.PENDING 
        institution.save(update_fields=['status'])
        
        return success_response({"message": "Abort sequence initiated and cleanup task queued."})

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

    @action(detail=True, methods=['post'], url_path='request_info', url_name='request_info')
    def request_info(self, request, slug=None):
        institution = self.get_object()
        institution.status = Institution.RegistrationStatus.MORE_INFO
        institution.save()
        
        # TODO: Send email asking for more details
        
        return success_response({"message": "Requested more information from the institution."})

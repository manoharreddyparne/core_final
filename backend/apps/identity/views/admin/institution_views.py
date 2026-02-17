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
from apps.identity.utils.multitenancy import create_institution_schema
from django_tenants.utils import schema_context
from apps.auip_institution.models import PreSeededRegistry

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
        
        try:
            # Create dynamic schema record
            created = create_institution_schema(
                institution.schema_name, 
                name=institution.name, 
                domain=institution.domain
            )
            
            # ✅ IMPROVED MIGRATION SHIELD
            from django.core.management import call_command
            from django.db import connection
            import time

            def check_tables_ready(schema_name):
                with connection.cursor() as cursor:
                    # Check if the table exists in the specific schema (case-insensitive for safety)
                    query = """
                        SELECT count(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = %s 
                        AND table_name = 'auip_institution_preseededregistry'
                    """
                    cursor.execute(query, [schema_name.lower()])
                    exists = cursor.fetchone()[0] > 0
                    if not exists:
                        # Log what tables DO exist for debugging
                        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = %s", [schema_name.lower()])
                        tables = [r[0] for r in cursor.fetchall()]
                        logger.warning(f"[Multi-Tenancy] Tables found in {schema_name}: {tables}")
                    return exists

            max_retries = 5
            for i in range(max_retries):
                logger.info(f"[Multi-Tenancy] Syncing migrations for {institution.schema_name} (Attempt {i+1})")
                try:
                    call_command('migrate_schemas', schema_name=institution.schema_name, interactive=False, verbosity=0)
                    if check_tables_ready(institution.schema_name):
                        logger.info(f"✅ Schema {institution.schema_name} is ready for seeding.")
                        break
                except Exception as e:
                    logger.warning(f"Migration attempt {i+1} failed: {e}")
                
                time.sleep(2) # Give Postgres a moment to breathe
            else:
                raise Exception(f"Schema {institution.schema_name} tables were not created after {max_retries} attempts.")

            # Trigger Seed Logic: Populate PreSeededRegistry from registration data
            reg_data = institution.registration_data or {}
            initial_users = reg_data.get("initial_users", []) 
            
            with schema_context(institution.schema_name):
                # Ensure pg_trgm available in this schema
                from django.db import connection as tenant_conn
                with tenant_conn.cursor() as cursor:
                    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

                # Seeding Logic using the ORM (now safe with forced search_path)
                if not initial_users:
                    logger.info(f"[Multi-Tenancy] Seeding default admin for {institution.contact_email}")
                    PreSeededRegistry.objects.get_or_create(
                        identifier=institution.contact_email,
                        defaults={
                            "email": institution.contact_email,
                            "role": "ADMIN"
                        }
                    )
                else:
                    for user in initial_users:
                        identifier = user.get("identifier")
                        if identifier:
                            PreSeededRegistry.objects.get_or_create(
                                identifier=identifier,
                                defaults={
                                    "email": user.get("email"),
                                    "role": user.get("role", "STUDENT")
                                }
                            )

            # Update Status
            institution.status = Institution.RegistrationStatus.APPROVED
            institution.save()

            # Trigger Email Notification
            try:
                from django.core.mail import send_mail
                from django.conf import settings
                
                subject = f"AUIP Platform: {institution.name} Approved"
                message = f"""
                Hello,

                Great news! The AUIP instance for {institution.name} has been successfully provisioned and approved.

                Institution Details:
                - Name: {institution.name}
                - Domain: {institution.domain}
                - Status: ACTIVE

                You can now log in to your institutional portal using your administrator credentials.

                Welcome to the future of unified academic governance.

                Best regards,
                AUIP Platform Team
                """
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [institution.contact_email],
                    fail_silently=True
                )
                logger.info(f"[Institution-Approval] Notification email sent to {institution.contact_email}")
            except Exception as mail_err:
                logger.error(f"[Institution-Approval] Failed to send email: {mail_err}")

            logger.info(f"[Institution-Approval] APPROVED, SCHEMA CREATED, and SEEDED: {institution.name}")
            return success_response({
                "message": f"Institution {institution.name} approved and isolated schema created successfully.",
                "notification_sent": True
            })
        except Exception as e:
            logger.error(f"[Institution-Approval] Failed to approve {institution.name} (Schema: {institution.schema_name}): {str(e)}", exc_info=True)
            # Temporarily include 'errors' for debugging the failure
            return error_response(
                f"Failed to create isolated environment for {institution.name}.",
                errors={
                    "detail": str(e),
                    "schema_attempted": institution.schema_name
                }
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

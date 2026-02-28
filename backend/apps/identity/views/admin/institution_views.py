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
            # ── 1. Pre-check: Duplicate Email Constraint ──
            existing_user = User.objects.filter(email__iexact=institution.contact_email).first()
            if existing_user and existing_user.role == User.Roles.INSTITUTION_ADMIN:
                profile = InstitutionAdmin.objects.filter(user=existing_user).exclude(institution=institution).first()
                if profile:
                    return error_response(
                        f"The email {institution.contact_email} is already registered as an admin for {profile.institution.name}. Duplicate admin emails across different institutions are not permitted.",
                        code=status.HTTP_400_BAD_REQUEST
                    )

            reg_data = institution.registration_data or {}

            # ── 2. SYNCHRONOUS Schema Creation ──
            # This blocks until the schema + all migrations are fully applied.
            # Frontend animation keeps running during this time.
            logger.info(f"[Institution-Approval] Starting synchronous schema provisioning for {institution.schema_name}...")
            
            created = create_institution_schema(
                institution.schema_name,
                name=institution.name,
                domain=institution.domain
            )
            logger.info(f"[Institution-Approval] Schema {institution.schema_name} creation result: {created}")

            # ── 3. SYNCHRONOUS Seed Logic ──
            initial_users = reg_data.get("initial_users", [])
            
            with schema_context(institution.schema_name):
                from django.db import connection as tenant_conn
                with tenant_conn.cursor() as cursor:
                    cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

                from apps.auip_institution.models import (
                    AdminPreSeededRegistry, FacultyPreSeededRegistry, StudentPreSeededRegistry
                )

                if not initial_users:
                    AdminPreSeededRegistry.objects.get_or_create(
                        identifier=institution.contact_email,
                        defaults={"is_activated": False}
                    )
                else:
                    for u in initial_users:
                        identifier = u.get("identifier")
                        role = u.get("role", "STUDENT")
                        if identifier:
                            if role == 'ADMIN':
                                model = AdminPreSeededRegistry
                                defaults = {"is_activated": False}
                            elif role == 'FACULTY':
                                model = FacultyPreSeededRegistry
                                defaults = {"email": u.get("email"), "is_activated": False}
                            else:
                                model = StudentPreSeededRegistry
                                defaults = {"email": u.get("email"), "is_activated": False}

                            model.objects.get_or_create(
                                identifier=identifier,
                                defaults=defaults
                            )
            logger.info(f"[Institution-Approval] Schema {institution.schema_name} seeded successfully.")

            # ── 4. Mark Setup Complete + Approve ──
            institution.is_setup_complete = True
            institution.status = Institution.RegistrationStatus.APPROVED
            institution.save()

            # ── 5. Provision Institutional Admin User ──
            admin_name = reg_data.get("admin_name", "") or reg_data.get("contact_person", "")
            name_parts = admin_name.strip().split() if admin_name else []
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            admin_user, user_created = User.objects.get_or_create(
                email=institution.contact_email,
                defaults={
                    "username": institution.contact_email,
                    "role": User.Roles.INSTITUTION_ADMIN,
                    "first_name": first_name,
                    "last_name": last_name,
                    "need_password_reset": True,
                    "first_time_login": True,
                }
            )
            
            if user_created:
                admin_user.set_unusable_password()
                admin_user.save()
                logger.info(f"[Institution-Approval] Created User (INST_ADMIN) for {institution.contact_email}")
            else:
                if admin_user.role == User.Roles.SUPER_ADMIN:
                    logger.info(f"[Institution-Approval] Existing SUPER_ADMIN {institution.contact_email} skipping reset flags.")
                else:
                    admin_user.role = User.Roles.INSTITUTION_ADMIN
                    admin_user.need_password_reset = True
                    admin_user.first_time_login = True
                    admin_user.save(update_fields=["role", "need_password_reset", "first_time_login"])

            # Link Profile
            existing_profile = InstitutionAdmin.objects.filter(user=admin_user).first()
            if not existing_profile:
                InstitutionAdmin.objects.create(
                    user=admin_user,
                    institution=institution,
                    role_description=reg_data.get("designation", "Administrator")
                )

            # ── 6. Generate Activation Link ──
            activation_token = generate_activation_token(
                institution.id, institution.contact_email, "ADMIN"
            )
            activation_url = get_activation_url(activation_token, role="ADMIN")
            logger.info(f"[Institution-Approval] Activation link generated for {institution.contact_email}")

            # ── 7. Generate Certificate (before email so we can attach info) ──
            cert_url = None
            try:
                from apps.identity.services.certificates.builder import generate_institution_certificate
                cert_url = generate_institution_certificate(institution.id)
                if cert_url:
                    logger.info(f"[Institution-Approval] Certificate generated: {cert_url}")
            except Exception as cert_err:
                logger.warning(f"[Institution-Approval] Certificate generation skipped: {cert_err}")

            # ── 8. Send Approval + Activation Email (ASYNC to shave off SMTP latency) ──
            from threading import Thread
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = f"AUIP Platform: {institution.name} Approved — Set Up Your Admin Account"
            message = (
                f"Hello {admin_name or 'Administrator'},\n\n"
                f"Great news! Your institution {institution.name} has been approved on the AUIP Platform.\n\n"
                f"Institution Details:\n"
                f"  - Name: {institution.name}\n"
                f"  - Domain: {institution.domain}\n"
                f"  - Status: APPROVED\n\n"
                f"To activate your administrator account and set your password, click the link below:\n\n"
                f"  {activation_url}\n\n"
                f"This link expires in 7 days.\n\n"
                f"After activation, you will have access to unified academic governance.\n\n"
                f"Welcome to the future of unified academic governance.\n\n"
                f"Best regards,\n"
                f"AUIP Platform Team"
            )
            
            # Non-blocking SMTP send
            Thread(target=send_mail, args=(subject, message, settings.DEFAULT_FROM_EMAIL, [institution.contact_email]), kwargs={'fail_silently': False}).start()
            
            logger.info(f"[Institution-Approval] High-speed provisioning complete for {institution.name}")

            logger.info(f"[Institution-Approval] FULLY COMPLETE: {institution.name} — Schema ready, admin created, email sent.")
            
            return success_response({
                "message": f"Institution {institution.name} approved and fully provisioned.",
                "notification_sent": True,
                "schema_ready": True,
            })
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

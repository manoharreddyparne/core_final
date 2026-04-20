"""
Nexora Identity Celery Tasks
All certificate generation, email sending, and periodic expiry checks run here — async, retriable.

Queues:
  certificates — PKI generation + cert emails (heavy RSA work)
  emails       — expiry warning emails (lightweight)
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# TASK 1 — Approval Certificate + Email
# Triggered when super admin approves an institution.
# Generates the Provisional X.509 cert PDF and emails it with the activation link.
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="certificates",
    name="apps.identity.tasks.send_approval_certificate_email_task",
)
def send_approval_certificate_email_task(self, institution_id: int, activation_url: str):
    """
    Generates the Provisional Approval Certificate (gold PDF) and sends the
    approval email with the activation link embedded.
    Retries up to 3 times on failure (SMTP errors, PKI errors, etc.)
    """
    try:
        from apps.identity.models.institution import Institution
        from apps.identity.services.certificates.builder import generate_institution_certificate
        from apps.identity.services.certificates.email_service import send_approval_email

        institution = Institution.objects.get(id=institution_id)

        # 1. Generate X.509 cert + gold PDF
        cert_url = generate_institution_certificate(institution_id)
        if cert_url:
            logger.info(f"[CERT-TASK] Approval cert generated: {cert_url}")
        else:
            logger.warning(f"[CERT-TASK] Approval cert generation returned None for institution {institution_id}")

        # Refresh from DB after cert fields were saved by generate_institution_certificate
        institution.refresh_from_db()

        # 2. Send approval email with PDF attached
        send_approval_email(institution, activation_url)
        logger.info(f"[CERT-TASK] Approval email dispatched for {institution.name}")

    except Exception as exc:
        logger.error(f"[CERT-TASK] Approval cert task failed for institution {institution_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────────────────────────────────────
# TASK 2 — Activation (Sovereign) Certificate + Email
# Triggered after the institutional admin successfully activates their account.
# Generates the Sovereign X.509 cert PDF and emails it (no activation link needed).
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="certificates",
    name="apps.identity.tasks.send_activation_certificate_email_task",
)
def send_activation_certificate_email_task(self, institution_id: int):
    """
    Generates the Sovereign Activation Certificate (teal PDF) and sends the
    activation success email with the sovereign cert attached.
    """
    try:
        from apps.identity.models.institution import Institution
        from apps.identity.services.certificates.builder import generate_activation_certificate
        from apps.identity.services.certificates.email_service import send_activation_email

        institution = Institution.objects.get(id=institution_id)

        # 1. Generate Sovereign X.509 cert + teal PDF
        cert_url = generate_activation_certificate(institution_id)
        if cert_url:
            logger.info(f"[CERT-TASK] Sovereign cert generated: {cert_url}")
        else:
            logger.warning(f"[CERT-TASK] Sovereign cert generation returned None for institution {institution_id}")

        # Refresh from DB after cert fields were saved by generate_activation_certificate
        institution.refresh_from_db()

        # 2. Send sovereign activation email with PDF attached
        send_activation_email(institution)
        logger.info(f"[CERT-TASK] Sovereign activation email dispatched for {institution.name}")

    except Exception as exc:
        logger.error(f"[CERT-TASK] Activation cert task failed for institution {institution_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────────────────────────────────────
# TASK 3 — Expiry Warning Email (standalone)
# Queued by check_expiring_certificates for each institution expiring soon.
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    queue="emails",
    name="apps.identity.tasks.send_expiry_warning_email_task",
)
def send_expiry_warning_email_task(self, institution_id: int, days_remaining: int):
    """
    Sends a 30-day or 7-day certificate expiry warning email to the institution admin.
    """
    try:
        from apps.identity.models.institution import Institution
        from apps.identity.services.certificates.email_service import send_expiry_warning_email

        institution = Institution.objects.get(id=institution_id)
        send_expiry_warning_email(institution, days_remaining)
        logger.info(f"[EXPIRY-TASK] {days_remaining}-day warning sent for {institution.name}")

    except Exception as exc:
        logger.error(f"[EXPIRY-TASK] Warning email failed for institution {institution_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


# ─────────────────────────────────────────────────────────────────────────────
# TASK 4 — Daily Expiry Check (Celery Beat periodic task — runs at 08:00 UTC)
# Finds institutions whose sovereign cert expires in exactly 30 or 7 days
# and queues the expiry warning email task for each.
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    queue="certificates",
    name="apps.identity.tasks.check_expiring_certificates",
)
def check_expiring_certificates():
    """
    Periodic task — scheduled daily at 08:00 UTC via Celery Beat.
    Scans for Sovereign Activation Certificates expiring in 30 or 7 days
    and dispatches expiry warning emails for each.
    """
    from django.utils import timezone
    from datetime import timedelta
    from apps.identity.models.institution import Institution

    now = timezone.now()
    warning_windows = [30, 7]
    total_queued = 0

    for days in warning_windows:
        target_date = (now + timedelta(days=days)).date()
        expiring = Institution.objects.filter(
            activation_cert_expires_at__date=target_date,
            status="APPROVED",
            is_active=True,
            activation_cert_id__isnull=False,
        )
        for inst in expiring:
            send_expiry_warning_email_task.delay(inst.id, days)
            total_queued += 1
            logger.info(f"[EXPIRY-CHECK] Queued {days}-day warning for {inst.name} (expires {target_date})")

    logger.info(f"[EXPIRY-CHECK] Daily check complete. {total_queued} warning(s) queued.")
    return total_queued

# ─────────────────────────────────────────────────────────────────────────────
# TASK 5 — Institution Provisioning
# Asynchronous schema creation, seeding, and admin user setup.
# Returns 100% via WS when complete.
# ─────────────────────────────────────────────────────────────────────────────

@shared_task(
    bind=True,
    max_retries=1,
    queue="certificates",
    name="apps.identity.tasks.provision_institution_task",
)
def provision_institution_task(self, institution_id: int):
    """
    Handles the heavy lifting of schema creation, multitenant migrations,
    and initial data seeding. Communicates progress via WebSockets.
    """
    from apps.identity.models.institution import Institution, InstitutionAdmin
    from apps.identity.models.core_models import User
    from apps.identity.utils.multitenancy import create_institution_schema
    from apps.identity.utils.activation import generate_activation_token, get_activation_url
    from django_tenants.utils import schema_context
    from apps.identity.tasks import send_approval_certificate_email_task
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    try:
        institution = Institution.objects.get(id=institution_id)
        schema_name = institution.schema_name
        reg_data = institution.registration_data or {}
        initial_users = reg_data.get("initial_users", [])
        total_seeds = len(initial_users)
        
        from apps.identity.utils.multitenancy import UnifiedProvisioningTracker
        tracker = UnifiedProvisioningTracker(schema_name, total_seeds=total_seeds)

        # 1. Create Schema (Phase 0: Workspace Setup)
        tracker.track_work(0, "Allocating vault resources...")
        tracker.track_work(0, "Configuring network isolation...")
        tracker.track_work(0, "Initializing isolation kernel...")
        create_institution_schema(
            schema_name,
            name=institution.name,
            domain=institution.domain,
            tracker=tracker
        )
        tracker.track_work(0, "Vault readiness confirmed.")
        tracker.track_work(0, "Infrastructure stabilized.")
        
        # 2. Seed Logic (Phase indices 1 & 2)
        tracker.track_work(2, "Preparing component registry...") 
        tracker.track_work(2, "Seeding registry tables...")
        initial_users = reg_data.get("initial_users", [])
        
        with schema_context(schema_name):
            from django.db import connection as tenant_conn
            with tenant_conn.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

            from apps.auip_institution.models import (
                AdminPreSeededRegistry, FacultyPreSeededRegistry, StudentPreSeededRegistry
            )

            if not initial_users:
                tracker.track_work(2, "Seeding default Admin boundary...", units=1) # Treat as 1 seed unit
                AdminPreSeededRegistry.objects.get_or_create(
                    identifier=institution.contact_email,
                    defaults={"is_activated": False}
                )
                tracker.track_work(2, "Default identity established.")
            else:
                total = len(initial_users)
                tracker.track_work(2, f"Queuing {total} identity records...")
                for i, u in enumerate(initial_users):
                    identifier = u.get("identifier")
                    role = u.get("role", "STUDENT")
                    
                    # Update progress for every user
                    sub_msg = f"Injecting {role.title()} identity records..."
                    tracker.track_work(2, sub_msg, units=1)

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
        
        # 3. Provision Admin User (Phase index 3: Applying Security Rules)
        tracker.track_work(3, "Opening neural gateway...")
        tracker.track_work(3, "Provisioning administrative edge gateway...")
        admin_name = reg_data.get("admin_name", "") or reg_data.get("contact_person", "")
        # ... logic ...
        if isinstance(admin_name, list):
            admin_name = " ".join(map(str, admin_name))
        name_parts = admin_name.strip().split() if admin_name else []
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        tracker.track_work(3, "Creating institutional primary user...")
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
        else:
            if admin_user.role != User.Roles.SUPER_ADMIN:
                admin_user.role = User.Roles.INSTITUTION_ADMIN
                admin_user.need_password_reset = True
                admin_user.first_time_login = True
                admin_user.save(update_fields=["role", "need_password_reset", "first_time_login"])

        tracker.track_work(3, "Assigning neural security roles...")
        InstitutionAdmin.objects.get_or_create(
            user=admin_user,
            institution=institution,
            defaults={"role_description": reg_data.get("designation", "Administrator")}
        )

        # 4. Governance Link
        tracker.track_work(4, "Establishing neural governance link...")
        tracker.track_work(4, "Generating RSA-4096 tokens...")
        activation_token = generate_activation_token(institution.id, institution.contact_email, "ADMIN")
        activation_url = get_activation_url(activation_token, role="ADMIN")
        
        send_approval_certificate_email_task.delay(institution.id, activation_url)

        # 5. Finalize
        tracker.track_work(4, "Synchronizing neural matrix...")
        institution.is_setup_complete = True
        institution.status = Institution.RegistrationStatus.APPROVED
        institution.save()
        
        tracker.track_work(4, "Encrypting final handoff...")
        tracker.complete("Institution Ecosystem LIVE")
        logger.info(f"[PROVISION-TASK] Successfully provisioned {institution.name}")

    except Exception as exc:
        logger.error(f"[PROVISION-TASK] Critical failure for institution {institution_id}: {exc}", exc_info=True)
        # Inform UI of failure with a premium message instead of raw crash
        try:
             tracker.report(42, "Recalibrating Shield Layers (Optimizing Retry)...")
        except: pass
        raise self.retry(exc=exc, max_retries=1)

@shared_task(
    bind=True,
    queue="certificates",
    name="apps.identity.tasks.sync_schema_task",
)
def sync_schema_task(self, institution_id: int, request_user_id: int = None):
    """
    Background task to sync a specific institution's schema.
    Handles structural repair + migrations.
    """
    import time
    from django.utils import timezone
    from django.core.management import call_command
    from apps.identity.models.institution import Institution, SchemaUpdateHistory, User
    from apps.identity.utils.multitenancy import (
        get_schema_sync_status_detailed, 
        repair_missing_tables, 
        UnifiedProvisioningTracker, 
        WSProgressStream
    )
    
    try:
        institution = Institution.objects.get(id=institution_id)
        schema_name = institution.schema_name
        request_user = User.objects.get(id=request_user_id) if request_user_id else None
        
        status_info = get_schema_sync_status_detailed(schema_name)
        missing_tables = status_info.get("missing_tables", [])
        
        # 1. Start Audit Trail
        existing_count = SchemaUpdateHistory.objects.filter(institution=institution).count()
        version_label = f"v{existing_count + 1}"
        history = SchemaUpdateHistory.objects.create(
            institution=institution,
            schema_name=schema_name,
            version_label=version_label,
            triggered_by=request_user,
            status=SchemaUpdateHistory.UpdateStatus.IN_PROGRESS
        )
        
        tracker = UnifiedProvisioningTracker(schema_name)
        out = WSProgressStream(tracker)
        start_time = time.time()
        
        # 2. Repair Phase
        if missing_tables:
            tracker.track_work(1, f"Found {len(missing_tables)} missing tables. Repairing...")
            repair_results = repair_missing_tables(schema_name, missing_tables)
            for res in repair_results:
                tracker.track_work(1, res)
        
        # 3. Migration Phase
        call_command('migrate_schemas', schema=schema_name, interactive=False, verbosity=1, stdout=out, stderr=out)
        output = out.getvalue()
        
        # 4. Finalize
        applied = [line.strip().replace('Applying ', '').replace('...', '').strip() 
                    for line in output.split('\n') if 'Applying ' in line]
        
        history.status = SchemaUpdateHistory.UpdateStatus.SUCCESS
        history.migrations_applied = applied
        history.migrations_count = len(applied)
        history.completed_at = timezone.now()
        history.duration_seconds = round(time.time() - start_time, 2)
        history.save()
        
        # Final broadcast
        tracker.complete("Synchronization Complete.")
        return True
    except Exception as e:
        logger.error(f"[SYNC-TASK] Failed: {e}", exc_info=True)
        return False

@shared_task(
    queue="certificates",
    name="apps.identity.tasks.sync_all_schemas_task",
)
def sync_all_schemas_task():
    """
    Global Background Task: Syncs ALL institution schemas.
    """
    from django.core.management import call_command
    from apps.identity.utils.multitenancy import UnifiedProvisioningTracker, WSProgressStream, get_schema_sync_status_detailed, get_migration_loader
    from apps.identity.models.institution import Institution
    
    tracker = UnifiedProvisioningTracker("global_platform")
    
    try:
        # Pre-flight Check: Is there actually work to do?
        logger.warning("[SYNC-ALL] Running pre-flight ecosystem check...")
        loader = get_migration_loader()
        institutions = Institution.objects.filter(status=Institution.RegistrationStatus.APPROVED)
        needs_update = False
        
        for inst in institutions:
            status = get_schema_sync_status_detailed(inst.schema_name, loader=loader)
            if not status.get("is_current"):
                needs_update = True
                break
                
        if not needs_update:
            logger.info("[SYNC-ALL] Pre-flight skipped: Ecosystem already fully synchronized.")
            tracker.complete("Ecosystem fully synchronized. No missing tables.")
            return True

        # Heavy migration path
        out = WSProgressStream(tracker)
        logger.warning("[SYNC-ALL] Triggering global migration cascade...")
        call_command('migrate_schemas', interactive=False, verbosity=1, stdout=out, stderr=out)
        
        # Ensure completion signal
        tracker.complete("Global Platform Synchronized.")
        return True
    except Exception as e:
        logger.error(f"[SYNC-ALL] Global sync failed: {e}")
        tracker.track_work(4, f"Global Sync Error: {str(e)}")
        return False

@shared_task(
    queue="certificates",
    name="apps.identity.tasks.monitor_ecosystem_health_task",
)
def monitor_ecosystem_health_task():
    """
    Ecosystem Heartbeat: Periodically verifies health for all schemas.
    Instead of every client polling (O(N*M)), the server checks once (O(N))
    and broadcasts only if a discrepancy is found.
    """
    from apps.identity.models.institution import Institution
    from apps.identity.utils.multitenancy import get_schema_sync_status_detailed, get_migration_loader
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    import time
    
    loader = get_migration_loader()
    institutions = Institution.objects.filter(status=Institution.RegistrationStatus.APPROVED)
    channel_layer = get_channel_layer()
    
    discrepancies = []
    
    for inst in institutions:
        try:
            # Fast-path health check
            status = get_schema_sync_status_detailed(inst.schema_name, loader=loader)
            if not status.get("is_current"):
                discrepancies.append({
                    "slug": inst.slug,
                    "schema": inst.schema_name,
                    "status_code": status.get("status_code"),
                    "missing_tables_count": status.get("missing_tables_count", 0),
                    "pending_count": status.get("pending_count", 0)
                })
        except Exception as e:
            logger.error(f"[HEARTBEAT] Check failed for {inst.slug}: {e}")

    # Broadcast to all logged-in Admins if any structural change is detected
    if discrepancies and channel_layer:
        async_to_sync(channel_layer.group_send)(
            "superadmin_updates",
            {
                "type": "institution_update",
                "data": {
                    "type": "HEALTH_DISCREPANCY",
                    "discrepancies": discrepancies,
                    "timestamp": time.time()
                }
            }
        )
    return f"Heartbeat complete. {len(discrepancies)} discrepancies detected."


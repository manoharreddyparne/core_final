"""
AUIP Identity Celery Tasks
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

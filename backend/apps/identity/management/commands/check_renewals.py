"""
Management command: check_renewals
Scans institutions for certificates approaching expiration and sends renewal notifications.
Recommended to run as a daily cron/task.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.identity.models.institution import Institution
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = "Scan for certificates approaching expiration (30, 7, 1 days) and notify admins."

    def handle(self, *args, **options):
        now = timezone.now()
        
        # Thresholds for notification
        THRESHOLDS = [
            (30, "Urgent: 30-Day Renewal Window Open"),
            (7, "Critical: 7 Days Until Certificate Expiry"),
            (1, "Final Notice: Certificate Expires Tomorrow"),
        ]

        self.stdout.write(f"[{now.date()}] Scanning for PKI certificate renewals...")

        total_notified = 0

        for days, label in THRESHOLDS:
            # We look for certs expiring precisely on 'days' from now (approx)
            # or in a small window to avoid missing daily runs
            target_start = now + timedelta(days=days)
            target_end = target_start + timedelta(days=1)

            expiring = Institution.objects.filter(
                certificate_expires_at__range=(target_start, target_end),
                status=Institution.RegistrationStatus.APPROVED
            )

            for inst in expiring:
                self.stdout.write(f"  -> Notifying {inst.name} ({days} days remaining)")
                self._send_renewal_notice(inst, days, label)
                total_notified += 1

        # Also check for EXPIRED certs today that weren't locked yet
        expired_today_start = now - timedelta(days=1)
        expired_today = Institution.objects.filter(
            certificate_expires_at__range=(expired_today_start, now),
            status=Institution.RegistrationStatus.APPROVED
        )
        for inst in expired_today:
            self.stdout.write(self.style.ERROR(f"  !! {inst.name} EXPIRED TODAY. Sending lockdown notice."))
            self._send_lockdown_notice(inst)
            total_notified += 1

        self.stdout.write(self.style.SUCCESS(f"Scan complete. Total notifications sent: {total_notified}"))

    def _send_renewal_notice(self, institution, days, subject_prefix):
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        renewal_url = f"{frontend_url}/dashboard/settings/renewal" # Placeholder for future renewal UI
        
        subject = f"{subject_prefix} - {institution.name}"
        message = (
            f"Dear Administrator,\n\n"
            f"This is an automated security notice from the Nexora.\n\n"
            f"The X.509 digital certificate for your node ({institution.domain}) is set to expire in {days} days on {institution.certificate_expires_at.strftime('%Y-%m-%d')}.\n\n"
            f"To prevent service interruption and avoid access revocation, please initiate the renewal process immediately through your administrative dashboard:\n\n"
            f"  {renewal_url}\n\n"
            f"If the certificate is not renewed by the expiry date, all institutional data access will be automatically locked by the PKI enforcement layer.\n\n"
            f"Best regards,\n"
            f"Nexora Governance Authority"
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [institution.contact_email],
            fail_silently=True
        )

    def _send_lockdown_notice(self, institution):
        subject = f"ACCESS REVOKED: Certificate Expired - {institution.name}"
        message = (
            f"URGENT NOTICE,\n\n"
            f"The digital certificate for {institution.name} has EXPIRED as of {institution.certificate_expires_at.strftime('%Y-%m-%d')}.\n\n"
            f"In accordance with Nexora security protocols, all network traffic to your institutional node has been revoked. Users will be unable to log in until the subscription is renewed and a new X.509 certificate is issued.\n\n"
            f"Please contact Nexora support or use the emergency recovery console to restore access.\n\n"
            f"Nexora PKI Enforcement System"
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [institution.contact_email],
            fail_silently=True
        )


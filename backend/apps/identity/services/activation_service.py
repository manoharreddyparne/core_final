"""
Email and Invitation Services for Student Activation
"""

import logging
import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from apps.identity.models.invitation import StudentInvitation
from apps.identity.models.core_models import CoreStudent

logger = logging.getLogger(__name__)


class NotificationService:
    """Centralized service for sending emails and notifications"""
    
    @staticmethod
    def send_activation_link(student, invitation):
        """Send activation link to student's official email"""
        
        activation_url = f"{settings.FRONTEND_URL}/activate?token={invitation.token}"
        
        subject = "Welcome to AUIP - Activate Your Account"
        message = (
            f"Hello {student.full_name},\n\n"
            f"Welcome to the Adaptive University Intelligence Platform.\n"
            f"Please activate your account by clicking the link below:\n\n"
            f"  {activation_url}\n\n"
            f"This link will expire in 7 days.\n\n"
            f"Regards,\nAUIP Team"
        )
        
        return send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.official_email],
            fail_silently=False,
        )


class ActivationService:
    """Service to handle the logic of creating invites and activating accounts"""
    
    @staticmethod
    def create_tenant_invitation(registry_entry, schema, entry_type="student"):
        """
        Create (or overwrite) an activation invitation for a tenant-isolated registry entry.

        Rules:
          ✅ Admin can always resend — the new token overwrites and invalidates the old one.
          🚫 Already-activated accounts are blocked (no link needed).
        """
        from datetime import timedelta
        from apps.identity.utils.activation import generate_activation_token, get_activation_url

        now = timezone.now()

        # 🛡️ Guard: already activated — no link possible
        if registry_entry.is_activated:
            raise ValueError("Account is already activated. No activation link can be issued.")

        # � Generate fresh signed token — overwrites (and invalidates) any existing token
        token = generate_activation_token(schema, registry_entry.identifier, entry_type.upper())

        # � Persist — no cooldown, no link-validity guard; admin controls resend timing
        registry_entry.activation_token = token
        registry_entry.token_expires_at = now + timedelta(days=7)  # 7-day validity window
        registry_entry.invitation_sent_at = now
        registry_entry.invitation_count = getattr(registry_entry, 'invitation_count', 0) + 1
        registry_entry.save()

        logger.info(
            f"[ACTIVATION] Token generated for {registry_entry.email} "
            f"(role={entry_type}, schema={schema}, expires={registry_entry.token_expires_at})"
        )

        # 📧 Build and dispatch activation email
        activation_url = get_activation_url(token, role=entry_type.upper())

        subject = f"[AUIP] Activate Your {entry_type.capitalize()} Account"
        message = (
            f"Hello,\n\n"
            f"You have been invited to join AUIP — the Adaptive University Intelligence Platform.\n\n"
            f"Click the link below to activate your account and set your password:\n\n"
            f"  {activation_url}\n\n"
            f"⏰ This link is valid for 7 days and expires automatically.\n"
            f"   Once activated, this link cannot be reused.\n"
            f"   If a new link is sent by your admin, this link will be invalidated.\n\n"
            f"If you did not expect this email, please contact your institution administrator.\n\n"
            f"Regards,\nAUIP Governance Team"
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[registry_entry.email],
                fail_silently=False,
            )
            logger.info(f"[ACTIVATION] Email dispatched to {registry_entry.email}")
        except Exception as mail_err:
            logger.error(f"[ACTIVATION] Email failed for {registry_entry.email}: {mail_err}")
            raise  # Re-raise so bulk_invite can count this as a failure

        return token

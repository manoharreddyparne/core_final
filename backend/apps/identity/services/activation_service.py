"""
Email and Invitation Services for Student Activation
Premium HTML email with personalization, dual-email dispatch, and security context.
"""

import logging
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _build_html_email(
    full_name: str,
    activation_url: str,
    entry_type: str,
    institution_name: str = "Your Institution",
    expires_days: int = 7,
) -> tuple[str, str]:
    """
    Returns (plain_text, html_content) for the activation email.
    """
    role_label = entry_type.capitalize()
    plain = (
        f"Hello {full_name},\n\n"
        f"You have been invited to join AUIP as a {role_label} at {institution_name}.\n\n"
        f"Activate your account here:\n  {activation_url}\n\n"
        f"This link is valid for {expires_days} days and can only be used once.\n"
        f"If a new link is sent by your admin, this one will be invalidated.\n\n"
        f"If you did not expect this, contact your institution administrator.\n\n"
        f"Regards,\nAUIP Governance Team"
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>AUIP Account Activation</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Inter', Arial, sans-serif; background: #050505; color: #ffffff; }}
  .wrapper {{ max-width: 600px; margin: 0 auto; background: #0a0a0a; }}
  .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); padding: 48px 40px; text-align: center; position: relative; overflow: hidden; }}
  .header::before {{ content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%); border-radius: 50%; }}
  .brand {{ display: inline-flex; align-items: center; gap: 12px; margin-bottom: 32px; }}
  .brand-icon {{ width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; display: flex; align-items: center; justify-content: center; }}
  .brand-text {{ font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #fff; }}
  .brand-text span {{ color: #6366f1; }}
  .badge {{ display: inline-block; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #a5b4fc; font-size: 10px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 20px; }}
  .header h1 {{ font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #fff; line-height: 1.2; }}
  .header h1 span {{ color: #818cf8; }}
  .body {{ padding: 40px; }}
  .greeting {{ font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }}
  .subtext {{ font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 32px; }}
  .subtext strong {{ color: #e2e8f0; }}
  .cta-block {{ text-align: center; margin: 32px 0; }}
  .cta-button {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 14px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; padding: 18px 48px; border-radius: 100px; box-shadow: 0 0 40px rgba(99,102,241,0.4); }}
  .cta-label {{ font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600; margin-top: 12px; }}
  .divider {{ height: 1px; background: rgba(255,255,255,0.05); margin: 32px 0; }}
  .security-block {{ background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.1); border-radius: 16px; padding: 24px; margin-bottom: 24px; }}
  .security-title {{ font-size: 10px; font-weight: 900; color: #6366f1; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 16px; }}
  .security-item {{ display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; }}
  .security-icon {{ width: 20px; height: 20px; background: rgba(99,102,241,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; margin-top: 1px; }}
  .security-text {{ font-size: 12px; color: #94a3b8; line-height: 1.5; }}
  .security-text strong {{ color: #cbd5e1; }}
  .url-block {{ background: #0f172a; border: 1px dashed rgba(255,255,255,0.05); border-radius: 12px; padding: 16px 20px; margin: 20px 0; word-break: break-all; }}
  .url-label {{ font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; color: #475569; margin-bottom: 8px; }}
  .url-text {{ font-size: 11px; color: #6366f1; font-family: monospace; }}
  .footer {{ padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.04); background: #050505; }}
  .footer-text {{ font-size: 10px; color: #334155; text-align: center; line-height: 1.8; }}
  .footer-text a {{ color: #475569; }}
  .exp-chip {{ display: inline-block; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; padding: 4px 12px; border-radius: 100px; }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="brand">
      <div class="brand-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="brand-text">AUIP <span>Platform</span></div>
    </div>
    <div class="badge">Identity Access Request</div>
    <h1>Activate Your<br/><span>{role_label} Account</span></h1>
  </div>

  <div class="body">
    <p class="greeting">Hello, {full_name}</p>
    <p class="subtext">
      You have been invited to join the <strong>Adaptive University Intelligence Platform</strong>
      as a <strong>{role_label}</strong> at <strong>{institution_name}</strong>.
      Click the button below to set up your credentials and access your dashboard.
    </p>

    <div class="cta-block">
      <a href="{activation_url}" class="cta-button">Activate My Account →</a>
      <p class="cta-label">Secure one-time activation link</p>
    </div>

    <div class="url-block">
      <div class="url-label">Direct Link (if button doesn't work)</div>
      <div class="url-text">{activation_url}</div>
    </div>

    <div class="divider"></div>

    <div class="security-block">
      <div class="security-title">🔐 Security Protocol</div>
      <div class="security-item">
        <div class="security-icon">⏰</div>
        <div class="security-text">
          This link is valid for <strong>{expires_days} days</strong> and expires automatically.
          <span class="exp-chip">Time-Limited</span>
        </div>
      </div>
      <div class="security-item">
        <div class="security-icon">🔒</div>
        <div class="security-text">
          This link can only be used <strong>once</strong>. Once your account is activated, this URL is permanently invalidated.
        </div>
      </div>
      <div class="security-item">
        <div class="security-icon">♻️</div>
        <div class="security-text">
          If your administrator sends a new invitation link, this one will be <strong>automatically revoked</strong>.
        </div>
      </div>
      <div class="security-item">
        <div class="security-icon">🚨</div>
        <div class="security-text">
          If you did not expect this email, <strong>do not click the link</strong> and contact your institution administrator immediately.
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p class="footer-text">
      This is an automated message from the AUIP Governance System.<br/>
      Sent on behalf of <strong>{institution_name}</strong> · Powered by AUIP Platform<br/>
      Do not reply to this email · <a href="#">Privacy Policy</a>
    </p>
  </div>
</div>
</body>
</html>"""
    return plain, html


class ActivationService:
    """Service to handle the logic of creating invites and activating accounts"""

    @staticmethod
    def create_tenant_invitation(registry_entry, schema, entry_type="student"):
        """
        Create (or overwrite) an activation invitation for a tenant-isolated registry entry.
        Sends a premium HTML email to official email (and personal email if available).
        """
        from datetime import timedelta
        from apps.identity.utils.activation import generate_activation_token, get_activation_url

        now = timezone.now()

        if registry_entry.is_activated:
            raise ValueError("Account is already activated. No activation link can be issued.")

        # Generate fresh signed token
        token = generate_activation_token(schema, registry_entry.identifier, entry_type.upper())

        registry_entry.activation_token = token
        registry_entry.token_expires_at = now + timedelta(days=7)
        registry_entry.invitation_sent_at = now
        registry_entry.invitation_count = getattr(registry_entry, 'invitation_count', 0) + 1
        registry_entry.save()

        logger.info(
            f"[ACTIVATION] Token generated for {registry_entry.email} "
            f"(role={entry_type}, schema={schema}, expires={registry_entry.token_expires_at})"
        )

        # Resolve institution name for email personalization
        try:
            from django_tenants.utils import schema_context as _sc
            from apps.identity.models.institution import Institution
            inst = Institution.objects.filter(schema_name=schema).first()
            institution_name = inst.name if inst else "Your Institution"
        except Exception:
            institution_name = "Your Institution"

        # Resolve student's full name if available from academic registry
        full_name = "Student"
        try:
            from apps.auip_institution.models import StudentAcademicRegistry
            academic = StudentAcademicRegistry.objects.filter(
                roll_number__iexact=registry_entry.identifier
            ).first()
            if academic:
                full_name = academic.full_name.title()
                personal_email = academic.personal_email
            else:
                personal_email = None
        except Exception:
            personal_email = None

        activation_url = get_activation_url(token, role=entry_type.upper())
        plain_text, html_content = _build_html_email(
            full_name=full_name,
            activation_url=activation_url,
            entry_type=entry_type,
            institution_name=institution_name,
            expires_days=7,
        )
        subject = f"[AUIP] Activate Your {entry_type.capitalize()} Account — {institution_name}"

        # Collect recipient list: official + personal (deduped)
        recipients = [registry_entry.email]
        if personal_email and personal_email.strip() and personal_email.strip() != registry_entry.email:
            recipients.append(personal_email.strip())

        dispatched_to = []
        for recipient in recipients:
            try:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=plain_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[recipient],
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send()
                dispatched_to.append(recipient)
                logger.info(f"[ACTIVATION] Email dispatched to {recipient}")
            except Exception as mail_err:
                logger.error(f"[ACTIVATION] Email failed for {recipient}: {mail_err}")
                if recipient == registry_entry.email:
                    raise  # Only re-raise on primary email failure

        return {"token": token, "dispatched_to": dispatched_to}



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

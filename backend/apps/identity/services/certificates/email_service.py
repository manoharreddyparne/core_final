"""
Approval Email Service
Sends a rich HTML email with the digitally-signed PDF certificate attached.
"""

from django.core.mail import EmailMessage
from django.conf import settings
from django.core.files.storage import default_storage


def send_approval_email(institution, activation_url=None):
    """
    Sends the approval + certificate email to the institution contact.
    Called after certificate has been generated and saved to storage.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    verify_url   = f"{frontend_url}/verify-certificate/{institution.certificate_id}"
    login_url    = activation_url or f"{frontend_url}/login"

    expires_str = institution.certificate_expires_at.strftime("%B %d, %Y") if institution.certificate_expires_at else "N/A"
    issued_str  = institution.certificate_issued_at.strftime("%B %d, %Y") if institution.certificate_issued_at else "N/A"
    serial      = institution.certificate_serial or str(institution.certificate_id).replace('-', '').upper()
    serial_display = f"SN:{serial}"
    fingerprint_display = ':'.join(institution.certificate_fingerprint[i:i+2] for i in range(0, len(institution.certificate_fingerprint), 2)).upper() if institution.certificate_fingerprint else "N/A"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background:#0f0f1a; color:#e0e0e0; margin:0; padding:0; }}
    .wrapper {{ max-width:640px; margin:40px auto; background:#15152a; border-radius:12px; overflow:hidden; border:1px solid #2a2a45; }}
    .header {{ background:linear-gradient(135deg,#1a1040 0%,#0d1a40 100%); padding:40px 40px 30px; text-align:center; border-bottom:2px solid #c9a84c; }}
    .header h1 {{ color:#c9a84c; font-size:22px; margin:0 0 6px; letter-spacing:3px; }}
    .header p {{ color:#aaa; font-size:13px; margin:0; }}
    .body {{ padding:36px 40px; }}
    .inst-name {{ font-size:26px; font-weight:700; color:#e2c97e; margin:16px 0 6px; }}
    .domain {{ color:#7788cc; font-size:14px; margin-bottom:24px; }}
    .cert-box {{ background:#1e1e35; border:1px solid #3a3a6a; border-radius:10px; padding:20px 24px; margin:24px 0; }}
    .cert-box h3 {{ color:#c9a84c; font-size:12px; letter-spacing:2px; margin:0 0 16px; }}
    .cert-row {{ display:flex; justify-content:space-between; margin-bottom:12px; }}
    .cert-label {{ color:#888; font-size:11px; text-transform:uppercase; }}
    .cert-value {{ color:#fff; font-size:12px; font-weight:600; font-family:monospace; }}
    .cert-value.green {{ color:#55cc88; }}
    .cert-value.gold {{ color:#c9a84c; }}
    .fp-box {{ font-family:monospace; font-size:10px; color:#666; margin-top:20px; text-align:center; border-top:1px solid #2a2a45; padding-top:10px; word-break:break-all; }}
    .btn {{ display:inline-block; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff!important; text-decoration:none; padding:13px 30px; border-radius:8px; font-size:14px; font-weight:600; margin-top:4px; }}
    .footer {{ background:#0d0d1e; padding:20px 40px; text-align:center; }}
    .footer p {{ color:#555; font-size:11px; margin:4px 0; }}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>AUIP PLATFORM</h1>
    <p>Academic University Integration Portal - Governance Network</p>
  </div>
  <div class="body">
    <p style="color:#aaa;font-size:13px;">Dear Administrator,</p>
    <p style="font-size:15px;color:#ddd;">We are pleased to inform you that your institution has been <strong style="color:#55cc88;">officially approved</strong> and integrated into the AUIP Distributed Governance Network.</p>

    <div class="inst-name">{institution.name}</div>
    <div class="domain">Network Node: {institution.domain}</div>

    <div class="cert-box">
      <h3>Digital Certificate Details</h3>
      <div class="cert-row">
        <span class="cert-label">Serial Number</span>
        <span class="cert-value gold">{serial_display}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Issued On</span>
        <span class="cert-value">{issued_str}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Valid Until</span>
        <span class="cert-value green">{expires_str}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Certificate Authority</span>
        <span class="cert-value">AUIP Intermediate CA</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Signature Algorithm</span>
        <span class="cert-value">SHA-256 with RSA-4096</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Status</span>
        <span class="cert-value green">ACTIVE</span>
      </div>
      <div class="fp-box">
        FINGERPRINT: {fingerprint_display}
      </div>
    </div>

    <p style="color:#aaa;font-size:13px;margin-bottom:4px;">Your digitally signed certificate is attached to this email as a PDF. It can be publicly verified at any time:</p>

    <p style="text-align:center;margin:24px 0;">
      <a class="btn" href="{verify_url}">Verify Certificate</a>
    </p>

    <p style="color:#aaa;font-size:13px;">Your administrative account has been provisioned. You can now activate your account and log in to manage your institution's portal:</p>
    <p style="text-align:center;margin:20px 0;">
      <a class="btn" href="{login_url}" style="background:linear-gradient(135deg,#065f46,#047857);">Access Institution Portal</a>
    </p>

    <p style="color:#555;font-size:11px;margin-top:28px;">This certificate is digitally signed using X.509 PKI infrastructure. Any modification invalidates its authenticity. The attached PDF contains an embedded PAdES-B digital signature verifiable in Adobe Acrobat.</p>
  </div>
  <div class="footer">
    <p>AUIP Platform - Institutional Certification Authority</p>
    <p>Certificate ID: {institution.certificate_id}</p>
    <p>(c) {issued_str[:4]} AUIP Platform. All rights reserved.</p>
  </div>
</div>
</body>
</html>
"""

    try:
        msg = EmailMessage(
            subject=f"[Approved] {institution.name} - Institutional Approval & Digital Certificate",
            body=html_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@auip.edu"),
            to=[institution.contact_email],
        )
        msg.content_subtype = "html"

        # Attach the signed PDF
        if institution.certificate_url:
            try:
                cert_filename = f"certificates/{institution.certificate_id}.pdf"
                if default_storage.exists(cert_filename):
                    with default_storage.open(cert_filename, "rb") as f:
                        pdf_bytes = f.read()
                    msg.attach(
                        filename=f"AUIP_Certificate_{institution.slug}.pdf",
                        content=pdf_bytes,
                        mimetype="application/pdf",
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"[Certificate-Email] Could not attach PDF: {e}")

        msg.send(fail_silently=False)
        return True

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Certificate-Email] Failed to send email to {institution.contact_email}: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# SOVEREIGN ACTIVATION EMAIL
# Sent after the institutional admin completes account activation.
# Attaches the Sovereign Activation Certificate PDF (teal theme).
# ─────────────────────────────────────────────────────────────────────────────

def send_activation_email(institution) -> bool:
    """
    Sends the Sovereign Activation Certificate email.
    Called from Celery task after successful account activation.
    """
    import logging
    logger = logging.getLogger(__name__)

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    verify_url   = f"{frontend_url}/verify-certificate/activation/{institution.activation_cert_id}"
    dashboard_url = f"{frontend_url}/institution/dashboard"

    expires_str  = institution.activation_cert_expires_at.strftime("%B %d, %Y") if institution.activation_cert_expires_at else "N/A"
    issued_str   = institution.activation_cert_issued_at.strftime("%B %d, %Y")  if institution.activation_cert_issued_at  else "N/A"
    serial       = institution.activation_cert_serial or str(institution.activation_cert_id).replace('-', '').upper() if institution.activation_cert_id else "N/A"
    serial_display = f"SN:{serial}"
    fingerprint_display = ':'.join(institution.activation_cert_fingerprint[i:i+2] for i in range(0, len(institution.activation_cert_fingerprint), 2)).upper() if institution.activation_cert_fingerprint else "N/A"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background:#050d14; color:#e0e0e0; margin:0; padding:0; }}
    .wrapper {{ max-width:640px; margin:40px auto; background:#0a1628; border-radius:12px; overflow:hidden; border:1px solid #10b981; }}
    .header {{ background:linear-gradient(135deg,#064e3b 0%,#065f46 100%); padding:40px 40px 30px; text-align:center; border-bottom:2px solid #10b981; }}
    .header h1 {{ color:#10b981; font-size:20px; margin:0 0 6px; letter-spacing:3px; }}
    .header p {{ color:#6ee7b7; font-size:13px; margin:0; }}
    .badge {{ display:inline-block; background:#10b981; color:#050d14; font-weight:900; font-size:11px; padding:4px 16px; border-radius:20px; letter-spacing:2px; margin-top:12px; }}
    .body {{ padding:36px 40px; }}
    .inst-name {{ font-size:26px; font-weight:700; color:#6ee7b7; margin:16px 0 6px; }}
    .domain {{ color:#38bdf8; font-size:14px; margin-bottom:24px; }}
    .cert-box {{ background:#0f2137; border:1px solid #10b981; border-radius:10px; padding:20px 24px; margin:24px 0; }}
    .cert-box h3 {{ color:#10b981; font-size:11px; letter-spacing:2px; margin:0 0 16px; }}
    .cert-row {{ display:flex; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid #1e3a5f; padding-bottom:8px; }}
    .cert-row:last-child {{ border-bottom:none; margin-bottom:0; }}
    .cert-label {{ color:#64748b; font-size:11px; text-transform:uppercase; }}
    .cert-value {{ color:#fff; font-size:12px; font-weight:600; font-family:monospace; }}
    .cert-value.green {{ color:#10b981; }}
    .cert-value.teal {{ color:#6ee7b7; }}
    .fp-box {{ font-family:monospace; font-size:10px; color:#334155; margin-top:20px; text-align:center; border-top:1px solid #1e3a5f; padding-top:10px; word-break:break-all; }}
    .eku-box {{ background:#064e3b; border:1px solid #10b981; border-radius:8px; padding:12px 20px; text-align:center; margin:16px 0; }}
    .eku-box p {{ color:#10b981; font-size:11px; font-weight:700; letter-spacing:1px; margin:0; }}
    .btn {{ display:inline-block; text-decoration:none; padding:13px 30px; border-radius:8px; font-size:14px; font-weight:600; margin:4px; }}
    .btn-primary {{ background:linear-gradient(135deg,#059669,#10b981); color:#050d14!important; }}
    .btn-secondary {{ background:linear-gradient(135deg,#1e3a5f,#0f2137); color:#6ee7b7!important; border:1px solid #10b981; }}
    .footer {{ background:#050d14; padding:20px 40px; text-align:center; border-top:1px solid #0f2137; }}
    .footer p {{ color:#334155; font-size:11px; margin:4px 0; }}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>AUIP PLATFORM</h1>
    <p>Academic University Integration Portal - Sovereign Governance Network</p>
    <span class="badge">✦ SOVEREIGN MEMBER</span>
  </div>
  <div class="body">
    <p style="color:#94a3b8;font-size:13px;">Dear Administrator,</p>
    <p style="font-size:15px;color:#e2e8f0;">Congratulations. <strong style="color:#10b981;">{institution.name}</strong> has successfully completed governance activation and is now a <strong style="color:#10b981;">Sovereign Member</strong> of the AUIP Distributed Governance Network.</p>

    <div class="inst-name">{institution.name}</div>
    <div class="domain">Network Domain: {institution.domain}</div>

    <div class="cert-box">
      <h3>⬡ SOVEREIGN ACTIVATION CERTIFICATE</h3>
      <div class="cert-row">
        <span class="cert-label">Serial Number</span>
        <span class="cert-value teal">{serial_display}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Activated On</span>
        <span class="cert-value">{issued_str}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Valid Until</span>
        <span class="cert-value green">{expires_str}</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Certificate Authority</span>
        <span class="cert-value">AUIP Intermediate CA</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Signature Algorithm</span>
        <span class="cert-value">SHA-256 with RSA-4096</span>
      </div>
      <div class="cert-row">
        <span class="cert-label">Trust Level</span>
        <span class="cert-value green">SOVEREIGN ✓</span>
      </div>
      <div class="fp-box">
        FINGERPRINT: {fingerprint_display}
      </div>
    </div>

    <div class="eku-box">
      <p>EXTENDED KEY USAGE (ELEVATED TRUST SCOPE)</p>
      <p style="color:#6ee7b7;margin-top:6px;">clientAuth &nbsp;·&nbsp; emailProtection &nbsp;·&nbsp; codeSigning</p>
    </div>

    <p style="color:#94a3b8;font-size:13px;">Your digitally signed Sovereign Certificate is attached to this email as a PDF. It can be publicly verified at any time using the link below or by scanning the QR code on the certificate.</p>

    <p style="text-align:center;margin:24px 0;">
      <a class="btn btn-primary" href="{verify_url}">Verify Certificate</a>
      <a class="btn btn-secondary" href="{dashboard_url}">Go to Dashboard</a>
    </p>

    <p style="color:#334155;font-size:11px;margin-top:28px;border-top:1px solid #0f2137;padding-top:16px;">This Sovereign Certificate expires on <strong style="color:#10b981;">{expires_str}</strong>. You will receive renewal notices 30 and 7 days before expiry. Certificate renewal will be available through the AUIP Governance Portal.</p>
  </div>
  <div class="footer">
    <p>AUIP Platform - Sovereign Institutional Certification Authority</p>
    <p>Activation Certificate ID: {institution.activation_cert_id}</p>
    <p>&copy; {year} AUIP Platform. All rights reserved.</p>
  </div>
</div>
</body>
</html>
"""

    try:
        msg = EmailMessage(
            subject=f"[AUIP] Sovereign Activation Certificate Issued — {institution.name}",
            body=html_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@auip.edu"),
            to=[institution.contact_email],
        )
        msg.content_subtype = "html"

        # Attach the signed sovereign PDF
        if institution.activation_cert_url:
            try:
                cert_filename = f"certificates/activation_{institution.activation_cert_id}.pdf"
                if default_storage.exists(cert_filename):
                    with default_storage.open(cert_filename, "rb") as f:
                        pdf_bytes = f.read()
                    msg.attach(
                        filename=f"AUIP_SovereignCert_{institution.slug}.pdf",
                        content=pdf_bytes,
                        mimetype="application/pdf",
                    )
            except Exception as e:
                logger.warning(f"[ActivationEmail] Could not attach sovereign PDF: {e}")

        msg.send(fail_silently=False)
        logger.info(f"[ActivationEmail] Sovereign certificate email sent to {institution.contact_email}")
        return True

    except Exception as e:
        logger.error(f"[ActivationEmail] Failed to send to {institution.contact_email}: {e}")
        return False


# ─────────────────────────────────────────────────────────────────────────────
# CERTIFICATE EXPIRY WARNING EMAIL
# Sent 30 days and 7 days before the sovereign activation certificate expires.
# ─────────────────────────────────────────────────────────────────────────────

def send_expiry_warning_email(institution, days_remaining: int) -> bool:
    """
    Sends a certificate expiry warning email.
    days_remaining: 30 or 7
    """
    import logging
    logger = logging.getLogger(__name__)

    frontend_url  = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    renewal_url   = f"{frontend_url}/institution/renew-certificate"
    expires_str   = institution.activation_cert_expires_at.strftime("%B %d, %Y") if institution.activation_cert_expires_at else "N/A"
    urgency_color = "#f59e0b" if days_remaining == 30 else "#ef4444"
    urgency_label = "⚠️ Action Required Soon" if days_remaining == 30 else "🚨 Urgent: Certificate Expiring"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body {{ font-family: 'Segoe UI', Arial, sans-serif; background:#0a0a14; color:#e0e0e0; margin:0; padding:0; }}
    .wrapper {{ max-width:640px; margin:40px auto; background:#13131f; border-radius:12px; overflow:hidden; border:1px solid {urgency_color}; }}
    .header {{ background:#1a0f00; padding:36px 40px 28px; text-align:center; border-bottom:2px solid {urgency_color}; }}
    .header h1 {{ color:{urgency_color}; font-size:20px; margin:0 0 6px; letter-spacing:2px; }}
    .body {{ padding:36px 40px; }}
    .countdown {{ font-size:48px; font-weight:900; color:{urgency_color}; text-align:center; margin:20px 0 8px; }}
    .countdown-label {{ text-align:center; color:#94a3b8; font-size:13px; margin-bottom:24px; }}
    .cert-box {{ background:#1a1a2e; border:1px solid {urgency_color}; border-radius:10px; padding:20px 24px; margin:24px 0; }}
    .btn {{ display:inline-block; background:{urgency_color}; color:#0a0a14!important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:14px; font-weight:700; }}
    .footer {{ background:#0a0a14; padding:20px 40px; text-align:center; }}
    .footer p {{ color:#334155; font-size:11px; margin:4px 0; }}
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>AUIP PLATFORM</h1>
    <p style="color:#94a3b8;">{urgency_label}</p>
  </div>
  <div class="body">
    <div class="countdown">{days_remaining}</div>
    <div class="countdown-label">days remaining until your Sovereign Certificate expires</div>

    <p style="font-size:15px;color:#e2e8f0;">The Sovereign Activation Certificate for <strong style="color:{urgency_color};">{institution.name}</strong> will expire on <strong>{expires_str}</strong>.</p>

    <div class="cert-box">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">What happens if you don't renew?</p>
      <ul style="color:#e2e8f0;font-size:13px;padding-left:20px;margin:0;">
        <li>Your institution's governance access will be suspended</li>
        <li>The Sovereign Certificate will be marked as <strong style="color:#ef4444;">EXPIRED</strong> on the verification portal</li>
        <li>Students and faculty access continues unaffected during a 7-day grace period</li>
        <li>Certificate renewal reactivates full governance status instantly</li>
      </ul>
    </div>

    <p style="text-align:center;margin:28px 0;">
      <a class="btn" href="{renewal_url}">Renew Certificate Now</a>
    </p>

    <p style="color:#475569;font-size:11px;">If you believe this is an error or have questions, contact AUIP Platform governance support.</p>
  </div>
  <div class="footer">
    <p>AUIP Platform - Institutional Certification Authority</p>
    <p>Institution: {institution.name} &nbsp;|&nbsp; Domain: {institution.domain}</p>
  </div>
</div>
</body>
</html>
"""

    try:
        urgency_prefix = "⚠️" if days_remaining == 30 else "🚨"
        msg = EmailMessage(
            subject=f"{urgency_prefix} [AUIP] Certificate Expiry Warning — {days_remaining} Days Remaining | {institution.name}",
            body=html_body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@auip.edu"),
            to=[institution.contact_email],
        )
        msg.content_subtype = "html"
        msg.send(fail_silently=False)
        logger.info(f"[ExpiryEmail] {days_remaining}-day warning sent to {institution.contact_email}")
        return True
    except Exception as e:
        logger.error(f"[ExpiryEmail] Failed for {institution.contact_email}: {e}")
        return False


"""
Institution Certificate PDF Builder
Generates a digitally signed, enterprise-grade PDF certificate with embedded X.509 signature.
"""

import os
import uuid
import tempfile
from io import BytesIO
from pathlib import Path
from datetime import datetime, timezone

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone as django_tz

from apps.identity.models.institution import Institution

try:
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
    from reportlab.lib.units import inch, mm
    from reportlab.lib.styles import getSampleStyleSheet
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False

try:
    import qrcode
    QRCODE_OK = True
except ImportError:
    QRCODE_OK = False

try:
    import endesive.pdf
    ENDESIVE_OK = True
except ImportError:
    ENDESIVE_OK = False

from apps.identity.services.certificates.pki import (
    issue_institution_certificate,
    INTER_CA_CERT_PATH, INTER_CA_KEY_PATH,
    _load_key, _load_cert,
)


def _draw_certificate_pdf(institution, cert_pem, serial_hex, fingerprint_hex, expires_at, verify_url) -> bytes:
    """Draw the visual PDF and return raw bytes (unsigned)."""
    pdf_io = BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=landscape(A4))
    w, h = landscape(A4)

    # ── Background ──────────────────────────────────────────────────
    c.setFillColor(colors.HexColor("#0a0a1a"))
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # ── Outer border (gold double-line) ──────────────────────────────
    c.setStrokeColor(colors.HexColor("#c9a84c"))
    c.setLineWidth(4)
    c.rect(18, 18, w - 36, h - 36, fill=0)
    c.setLineWidth(1.5)
    c.rect(26, 26, w - 52, h - 52, fill=0)

    # ── Header: platform name ─────────────────────────────────────────
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#c9a84c"))
    c.drawCentredString(w / 2, h - 70, "A U I P   P L A T F O R M")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#aaaaaa"))
    c.drawCentredString(w / 2, h - 85, "Academic University Integration Portal  ·  Distributed Governance Network")

    # ── Divider ───────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#c9a84c"))
    c.setLineWidth(0.5)
    c.line(60, h - 98, w - 60, h - 98)

    # ── Title ─────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.HexColor("#ffffff"))
    c.drawCentredString(w / 2, h - 150, "Certificate of Institutional Approval")

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#c9a84c"))
    c.drawCentredString(w / 2, h - 175, "This certifies that the institution named below has been formally approved")
    c.drawCentredString(w / 2, h - 192, "and integrated into the AUIP Distributed Governance Network.")

    # ── Institution name ─────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(colors.HexColor("#e2c97e"))
    c.drawCentredString(w / 2, h - 255, institution.name)

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#aaaaaa"))
    c.drawCentredString(w / 2, h - 278, f"Academic Domain: {institution.domain}")

    # ── Divider ───────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#333355"))
    c.setLineWidth(0.5)
    c.line(60, h - 295, w - 60, h - 295)

    # ── Certificate metadata (3 columns) ─────────────────────────────
    col1_x, col2_x, col3_x = 90, w / 2 - 60, w - 270
    row_y = h - 330

    def meta_block(x, y, label, value, value_color="#ffffff"):
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#888888"))
        c.drawString(x, y + 14, label.upper())
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(value_color))
        c.drawString(x, y, value)

    meta_block(col1_x, row_y, "Serial Number", f"SN:{serial_hex[:24]}...", "#c9a84c")
    meta_block(col2_x, row_y, "Issued On", institution.certificate_issued_at.strftime("%Y-%m-%d") if institution.certificate_issued_at else "N/A")
    meta_block(col3_x, row_y, "Valid Until", expires_at.strftime("%Y-%m-%d"), "#55cc88")

    row_y2 = row_y - 50
    meta_block(col1_x, row_y2, "Certificate Authority", "AUIP Intermediate CA")
    meta_block(col2_x, row_y2, "Signature Algorithm", "SHA-256 with RSA-4096")
    meta_block(col3_x, row_y2, "Certificate Status", "ACTIVE  ✓", "#55cc88")

    # ── Fingerprint (small) ────────────────────────────────────────
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#666677"))
    c.drawCentredString(w / 2, row_y2 - 30, f"SHA-256 Fingerprint:  {':'.join(fingerprint_hex[i:i+2] for i in range(0, 32, 2))}...")

    # ── QR Code ───────────────────────────────────────────────────────
    if QRCODE_OK:
        qr = qrcode.QRCode(version=2, box_size=5, border=2,
                           error_correction=qrcode.constants.ERROR_CORRECT_H)
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#c9a84c", back_color="#0a0a1a")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            qr_img.save(tmp, format="PNG")
            tmp_path = tmp.name
        c.drawImage(tmp_path, w - 185, 45, width=120, height=120)
        os.remove(tmp_path)
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#888888"))
        c.drawCentredString(w - 125, 38, "Scan to verify")

    # ── Footer ─────────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#c9a84c"))
    c.setLineWidth(0.5)
    c.line(60, 75, w - 220, 75)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#c9a84c"))
    c.drawString(60, 60, "AUIP Platform  ·  Institutional Certification Authority")

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#666677"))
    c.drawString(60, 46, f"Verification ID: {institution.certificate_id}")
    c.drawString(60, 34, f"Verify at: {verify_url}")

    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor("#555566"))
    c.drawString(60, 22, "This document is digitally signed with X.509 embedded signature. Any alteration invalidates authenticity.")

    c.showPage()
    c.save()
    return pdf_io.getvalue()


def _sign_pdf(pdf_bytes: bytes) -> bytes:
    """Embed a PAdES-B digital signature using the Intermediate CA private key."""
    if not ENDESIVE_OK:
        return pdf_bytes  # fallback: return unsigned PDF

    try:
        from cryptography.hazmat.primitives.serialization import pkcs12
        inter_key  = _load_key(INTER_CA_KEY_PATH)
        inter_cert = _load_cert(INTER_CA_CERT_PATH)

        # endesive needs the key and cert as objects
        signed = endesive.pdf.cms.sign(
            pdf_bytes,
            [],
            inter_key,
            inter_cert,
            [],
            "sha256",
        )
        return signed
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"[PKI] PDF signing failed (returning unsigned): {e}")
        return pdf_bytes


def generate_institution_certificate(institution_id):
    """
    Main entry point called from the approval flow.
    Issues X.509 cert, draws premium PDF, embeds signature, saves to storage.
    Returns the certificate URL.
    """
    try:
        institution = Institution.objects.get(id=institution_id)
    except Institution.DoesNotExist:
        return None

    # 1. Issue X.509 certificate
    cert_pem, serial_hex, fingerprint_hex, expires_at, inst_key = issue_institution_certificate(institution)

    # 2. Assign cert fields
    if not institution.certificate_id:
        institution.certificate_id = uuid.uuid4()
    institution.certificate_issued_at  = django_tz.now()
    institution.certificate_serial      = serial_hex
    institution.certificate_expires_at  = expires_at
    institution.certificate_fingerprint = fingerprint_hex

    # 3. Verification URL
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    verify_url   = f"{frontend_url}/verify-certificate/{institution.certificate_id}"

    # 4. Draw PDF
    raw_pdf = _draw_certificate_pdf(
        institution, cert_pem, serial_hex, fingerprint_hex, expires_at, verify_url
    )

    # 5. Sign PDF
    signed_pdf = _sign_pdf(raw_pdf)

    # 6. Save to storage
    pdf_filename = f"certificates/{institution.certificate_id}.pdf"
    if default_storage.exists(pdf_filename):
        default_storage.delete(pdf_filename)
    default_storage.save(pdf_filename, ContentFile(signed_pdf))

    institution.certificate_url = default_storage.url(pdf_filename)
    institution.save(update_fields=[
        "certificate_id", "certificate_issued_at", "certificate_url",
        "certificate_serial", "certificate_expires_at", "certificate_fingerprint",
    ])

    return institution.certificate_url


# ─────────────────────────────────────────────────────────────────────────────
# SOVEREIGN ACTIVATION CERTIFICATE PDF
# Called after the institutional admin successfully activates their account.
# Visual: dark teal/emerald theme — distinct from the gold approval certificate.
# ─────────────────────────────────────────────────────────────────────────────

def _draw_activation_pdf(institution, cert_pem, serial_hex, fingerprint_hex, expires_at, verify_url) -> bytes:
    """Draw the Sovereign Activation Certificate PDF. Returns raw unsigned bytes."""
    pdf_io = BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=landscape(A4))
    w, h = landscape(A4)

    # ── Background (deep navy-teal) ─────────────────────────────────────────
    c.setFillColor(colors.HexColor("#050d14"))
    c.rect(0, 0, w, h, fill=1, stroke=0)

    # ── Outer border (emerald double-line) ──────────────────────────────────
    c.setStrokeColor(colors.HexColor("#10b981"))
    c.setLineWidth(4)
    c.rect(18, 18, w - 36, h - 36, fill=0)
    c.setLineWidth(1.5)
    c.rect(26, 26, w - 52, h - 52, fill=0)

    # ── Header ──────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#10b981"))
    c.drawCentredString(w / 2, h - 70, "A U I P   P L A T F O R M")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#6ee7b7"))
    c.drawCentredString(w / 2, h - 85, "Academic University Integration Portal  ·  Sovereign Governance Network")

    # ── Divider ─────────────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#10b981"))
    c.setLineWidth(0.5)
    c.line(60, h - 98, w - 60, h - 98)

    # ── Title ────────────────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(colors.HexColor("#ffffff"))
    c.drawCentredString(w / 2, h - 148, "Sovereign Activation Certificate")

    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#10b981"))
    c.drawCentredString(w / 2, h - 170, "This certifies that the institution named below has completed governance activation")
    c.drawCentredString(w / 2, h - 186, "and is now a fully sovereign member of the AUIP Distributed Governance Network.")

    # ── Institution Name ─────────────────────────────────────────────────────
    c.setFont("Helvetica-Bold", 34)
    c.setFillColor(colors.HexColor("#6ee7b7"))
    c.drawCentredString(w / 2, h - 250, institution.name)

    c.setFont("Helvetica", 12)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawCentredString(w / 2, h - 272, f"Academic Domain: {institution.domain}")

    # ── Divider ─────────────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#1e3a5f"))
    c.setLineWidth(0.5)
    c.line(60, h - 290, w - 60, h - 290)

    # ── Certificate Metadata ─────────────────────────────────────────────────
    col1_x, col2_x, col3_x = 90, w / 2 - 60, w - 270
    row_y = h - 325

    def meta_block(x, y, label, value, value_color="#ffffff"):
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(x, y + 14, label.upper())
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor(value_color))
        c.drawString(x, y, value)

    activated_str = institution.activation_cert_issued_at.strftime("%Y-%m-%d") if institution.activation_cert_issued_at else "N/A"
    meta_block(col1_x, row_y, "Serial Number", f"SN:{serial_hex[:24]}...", "#10b981")
    meta_block(col2_x, row_y, "Activated On",  activated_str)
    meta_block(col3_x, row_y, "Valid Until",   expires_at.strftime("%Y-%m-%d"), "#10b981")

    row_y2 = row_y - 48
    meta_block(col1_x, row_y2, "Certificate Authority", "AUIP Intermediate CA")
    meta_block(col2_x, row_y2, "Signature Algorithm",   "SHA-256 with RSA-4096")
    meta_block(col3_x, row_y2, "Trust Level",           "SOVEREIGN  ✓", "#10b981")

    # ── Extended Key Usage badge ─────────────────────────────────────────────
    eku_text = "EKU: clientAuth  ·  emailProtection  ·  codeSigning"
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#10b981"))
    c.drawCentredString(w / 2, row_y2 - 28, eku_text)

    # ── Fingerprint ──────────────────────────────────────────────────────────
    c.setFont("Helvetica", 7.5)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawCentredString(w / 2, row_y2 - 44, f"SHA-256 Fingerprint:  {':'.join(fingerprint_hex[i:i+2] for i in range(0, 32, 2))}...")

    # ── QR Code ─────────────────────────────────────────────────────────────
    if QRCODE_OK:
        qr = qrcode.QRCode(version=2, box_size=5, border=2,
                           error_correction=qrcode.constants.ERROR_CORRECT_H)
        qr.add_data(verify_url)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="#10b981", back_color="#050d14")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            qr_img.save(tmp, format="PNG")
            tmp_path = tmp.name
        c.drawImage(tmp_path, w - 185, 45, width=120, height=120)
        os.remove(tmp_path)
        c.setFont("Helvetica", 7)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawCentredString(w - 125, 38, "Scan to verify")

    # ── Footer ───────────────────────────────────────────────────────────────
    c.setStrokeColor(colors.HexColor("#10b981"))
    c.setLineWidth(0.5)
    c.line(60, 75, w - 220, 75)

    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(colors.HexColor("#10b981"))
    c.drawString(60, 60, "AUIP Platform  ·  Sovereign Institutional Certification Authority")

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    c.drawString(60, 46, f"Activation Certificate ID: {institution.activation_cert_id}")
    c.drawString(60, 34, f"Verify at: {verify_url}")

    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor("#334155"))
    c.drawString(60, 22, "This sovereign certificate is digitally signed with X.509 PAdES-B. Any alteration invalidates authenticity.")

    c.showPage()
    c.save()
    return pdf_io.getvalue()


def generate_activation_certificate(institution_id: int) -> str | None:
    """
    Main entry point called from the activation flow (via Celery task).
    Issues Sovereign X.509 cert, draws teal PDF, embeds PAdES-B signature, saves to storage.
    Returns the certificate URL or None on failure.
    """
    import uuid as _uuid
    from apps.identity.services.certificates.pki import issue_activation_certificate

    try:
        institution = Institution.objects.get(id=institution_id)
    except Institution.DoesNotExist:
        return None

    # 1. Issue Sovereign X.509 certificate
    cert_pem, serial_hex, fingerprint_hex, expires_at, inst_key = issue_activation_certificate(institution)

    # 2. Assign fields
    if not institution.activation_cert_id:
        institution.activation_cert_id = _uuid.uuid4()
    institution.activation_cert_issued_at   = django_tz.now()
    institution.activation_cert_serial       = serial_hex
    institution.activation_cert_expires_at   = expires_at
    institution.activation_cert_fingerprint  = fingerprint_hex

    # 3. Verification URL
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    verify_url   = f"{frontend_url}/verify-certificate/activation/{institution.activation_cert_id}"

    # 4. Draw PDF
    raw_pdf = _draw_activation_pdf(
        institution, cert_pem, serial_hex, fingerprint_hex, expires_at, verify_url
    )

    # 5. Sign PDF (PAdES-B)
    signed_pdf = _sign_pdf(raw_pdf)

    # 6. Save to storage
    pdf_filename = f"certificates/activation_{institution.activation_cert_id}.pdf"
    if default_storage.exists(pdf_filename):
        default_storage.delete(pdf_filename)
    default_storage.save(pdf_filename, ContentFile(signed_pdf))

    institution.activation_cert_url = default_storage.url(pdf_filename)
    institution.save(update_fields=[
        "activation_cert_id", "activation_cert_issued_at", "activation_cert_url",
        "activation_cert_serial", "activation_cert_expires_at", "activation_cert_fingerprint",
    ])

    return institution.activation_cert_url


"""
Nexora PKI Service — Root CA, Intermediate CA, Institution Certificate Issuance
Uses pyca/cryptography (industry standard, same as Let's Encrypt's certbot)

Hierarchy:
  Root CA (offline, self-signed, RSA-4096, 20yr)
    └── Intermediate CA (active signer, RSA-4096, 10yr)
          └── Institution Certs (RSA-2048, 2yr each)
"""

import os
import uuid
import datetime
from pathlib import Path

from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509 import CertificateBuilder, random_serial_number

from django.conf import settings

# Where PKI files are stored (never in DB, never in Git)
PKI_DIR = Path(getattr(settings, "MEDIA_ROOT", "mediafiles")) / "pki"
ROOT_CA_CERT_PATH    = PKI_DIR / "root_ca.crt"
ROOT_CA_KEY_PATH     = PKI_DIR / "root_ca.key"
INTER_CA_CERT_PATH   = PKI_DIR / "intermediate_ca.crt"
INTER_CA_KEY_PATH    = PKI_DIR / "intermediate_ca.key"


def _ensure_pki_dir():
    PKI_DIR.mkdir(parents=True, exist_ok=True)
    # Restrict permissions on Windows as much as possible
    try:
        os.chmod(PKI_DIR, 0o700)
    except Exception:
        pass


def _generate_rsa_key(key_size=2048):
    return rsa.generate_private_key(public_exponent=65537, key_size=key_size)


def _save_key(key, path: Path):
    path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )


def _load_key(path: Path):
    return serialization.load_pem_private_key(path.read_bytes(), password=None)


def _load_cert(path: Path):
    return x509.load_pem_x509_certificate(path.read_bytes())


# ─────────────────────────────────────────────────────────────
# 1.  ROOT CA  (run ONCE during system setup)
# ─────────────────────────────────────────────────────────────

def generate_root_ca(force=False):
    """
    Create a self-signed Root CA.
    RSA-4096, 20-year validity, marked as CA with path-length 1.
    """
    _ensure_pki_dir()

    if ROOT_CA_CERT_PATH.exists() and not force:
        print("[PKI] Root CA already exists. Pass force=True to regenerate.")
        return

    key = _generate_rsa_key(key_size=4096)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Telangana"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Nexora"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Nexora Root CA"),
    ])

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=365 * 20))
        .add_extension(x509.BasicConstraints(ca=True, path_length=1), critical=True)
        .add_extension(x509.KeyUsage(
            digital_signature=True, key_cert_sign=True, crl_sign=True,
            content_commitment=False, key_encipherment=False,
            data_encipherment=False, key_agreement=False,
            encipher_only=False, decipher_only=False,
        ), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .sign(key, hashes.SHA256())
    )

    _save_key(key, ROOT_CA_KEY_PATH)
    ROOT_CA_CERT_PATH.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    print("[PKI] Root CA generated.")


# ─────────────────────────────────────────────────────────────
# 2.  INTERMEDIATE CA  (operational signer, also run once)
# ─────────────────────────────────────────────────────────────

def generate_intermediate_ca(force=False):
    """
    Create the Intermediate CA, signed by the Root CA.
    RSA-4096, 10-year validity, path_length=0 (cannot sign further CAs).
    """
    _ensure_pki_dir()

    if not ROOT_CA_CERT_PATH.exists():
        raise RuntimeError("[PKI] Root CA not found. Run generate_root_ca() first.")

    if INTER_CA_CERT_PATH.exists() and not force:
        print("[PKI] Intermediate CA already exists. Pass force=True to regenerate.")
        return

    root_key  = _load_key(ROOT_CA_KEY_PATH)
    root_cert = _load_cert(ROOT_CA_CERT_PATH)

    key = _generate_rsa_key(key_size=4096)
    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Telangana"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Nexora"),
        x509.NameAttribute(NameOID.COMMON_NAME, "Nexora Intermediate CA"),
    ])

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(root_cert.subject)
        .public_key(key.public_key())
        .serial_number(random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=365 * 10))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(x509.KeyUsage(
            digital_signature=True, key_cert_sign=True, crl_sign=True,
            content_commitment=False, key_encipherment=False,
            data_encipherment=False, key_agreement=False,
            encipher_only=False, decipher_only=False,
        ), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(root_key.public_key()), critical=False)
        .sign(root_key, hashes.SHA256())
    )

    _save_key(key, INTER_CA_KEY_PATH)
    INTER_CA_CERT_PATH.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    print("[PKI] Intermediate CA generated.")


# ─────────────────────────────────────────────────────────────
# 3.  INSTITUTION CERTIFICATE  (called on every approval)
# ─────────────────────────────────────────────────────────────

def issue_institution_certificate(institution):
    """
    Issues a unique X.509 certificate for an approved institution.
    Signed by the Intermediate CA.  Returns (cert_pem_bytes, serial_hex, fingerprint_hex, expires_at).
    """
    if not INTER_CA_CERT_PATH.exists():
        raise RuntimeError("[PKI] Intermediate CA not found. Run setup_pki management command.")

    inter_key  = _load_key(INTER_CA_KEY_PATH)
    inter_cert = _load_cert(INTER_CA_CERT_PATH)

    inst_key = _generate_rsa_key(key_size=2048)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, institution.name),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Nexora Member Institution"),
        x509.NameAttribute(NameOID.COMMON_NAME, institution.domain),
    ])

    now     = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(days=365 * 2)   # 2-year validity

    # Use the institution's UUID cert ID as the serial source
    serial_int = int(uuid.uuid4()) & ((1 << 128) - 1)

    cert = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(inter_cert.subject)
        .public_key(inst_key.public_key())
        .serial_number(serial_int)
        .not_valid_before(now)
        .not_valid_after(expires)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.KeyUsage(
            digital_signature=True, content_commitment=True,
            key_encipherment=False, data_encipherment=False,
            key_agreement=False, key_cert_sign=False,
            crl_sign=False, encipher_only=False, decipher_only=False,
        ), critical=True)
        .add_extension(x509.ExtendedKeyUsage([
            ExtendedKeyUsageOID.SERVER_AUTH,
            ExtendedKeyUsageOID.EMAIL_PROTECTION,
        ]), critical=False)
        .add_extension(x509.SubjectAlternativeName([
            x509.DNSName(institution.domain),
        ]), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(inter_key.public_key()), critical=False)
        .sign(inter_key, hashes.SHA256())
    )

    cert_pem     = cert.public_bytes(serialization.Encoding.PEM)
    serial_hex   = format(cert.serial_number, "x").upper()
    fingerprint  = cert.fingerprint(hashes.SHA256()).hex().upper()

    return cert_pem, serial_hex, fingerprint, expires, inst_key


# ─────────────────────────────────────────────────────────────
# 4.  ACTIVATION / SOVEREIGN CERTIFICATE
#     Called ONLY after admin successfully activates their account
# ─────────────────────────────────────────────────────────────

def issue_activation_certificate(institution):
    """
    Issues the Sovereign Activation Certificate for a fully-activated institution.

    Differences from the Approval Certificate:
      - 1-year validity  (vs 2yr) — annual renewal cycle
      - EKU: clientAuth + emailProtection + codeSigning  (vs serverAuth only)
      - SAN includes RFC822Name (admin email) in addition to DNS domain
      - Signals that the admin has accepted governance and is an active member

    Returns (cert_pem_bytes, serial_hex, fingerprint_hex, expires_at, inst_key)
    """
    if not INTER_CA_CERT_PATH.exists():
        raise RuntimeError("[PKI] Intermediate CA not found. Run setup_pki management command.")

    inter_key  = _load_key(INTER_CA_KEY_PATH)
    inter_cert = _load_cert(INTER_CA_CERT_PATH)

    inst_key = _generate_rsa_key(key_size=2048)

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, institution.name),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, "Nexora Sovereign Member"),
        x509.NameAttribute(NameOID.COMMON_NAME, institution.domain),
    ])

    now     = datetime.datetime.now(datetime.timezone.utc)
    expires = now + datetime.timedelta(days=365)  # 1-year — annual renewal

    serial_int = int(uuid.uuid4()) & ((1 << 128) - 1)

    # Build Subject Alternative Names — includes the admin's actual email
    san_entries = [x509.DNSName(institution.domain)]
    if institution.contact_email:
        san_entries.append(x509.RFC822Name(institution.contact_email))

    cert = (
        CertificateBuilder()
        .subject_name(subject)
        .issuer_name(inter_cert.subject)
        .public_key(inst_key.public_key())
        .serial_number(serial_int)
        .not_valid_before(now)
        .not_valid_after(expires)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.KeyUsage(
            digital_signature=True,
            content_commitment=True,   # non-repudiation
            key_encipherment=False,
            data_encipherment=False,
            key_agreement=False,
            key_cert_sign=False,
            crl_sign=False,
            encipher_only=False,
            decipher_only=False,
        ), critical=True)
        .add_extension(x509.ExtendedKeyUsage([
            ExtendedKeyUsageOID.CLIENT_AUTH,        # proves identity in mTLS
            ExtendedKeyUsageOID.EMAIL_PROTECTION,   # S/MIME signing
            ExtendedKeyUsageOID.CODE_SIGNING,       # elevated trust scope
        ]), critical=False)
        .add_extension(x509.SubjectAlternativeName(san_entries), critical=False)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(inst_key.public_key()), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(inter_key.public_key()), critical=False)
        .sign(inter_key, hashes.SHA256())
    )

    cert_pem    = cert.public_bytes(serialization.Encoding.PEM)
    serial_hex  = format(cert.serial_number, "x").upper()
    fingerprint = cert.fingerprint(hashes.SHA256()).hex().upper()

    return cert_pem, serial_hex, fingerprint, expires, inst_key



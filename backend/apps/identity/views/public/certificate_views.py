"""
Public Certificate Verification API
Supports two certificate types:
  - approval    → institution.certificate_id
  - activation  → institution.activation_cert_id (Sovereign Certificate)

GET /api/users/public/certificates/<uuid>/verify/?type=approval
GET /api/users/public/certificates/<uuid>/verify/?type=activation

Both are fully public — no auth required.
"""
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.utils import timezone
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.models.institution import Institution


def _cert_status(expires_at) -> str:
    """Returns VALID, EXPIRED, or UNKNOWN."""
    if not expires_at:
        return "UNKNOWN"
    return "VALID" if expires_at > timezone.now() else "EXPIRED"


class CertificateVerifyView(APIView):
    """
    Unified public endpoint to verify any AUIP digital certificate.
    ?type=approval   → Provisional Trust Certificate (issued on approval)
    ?type=activation → Sovereign Activation Certificate (issued after account activation)
    Default: approval
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, certificate_id, cert_type=None):
        # cert_type can come from URL path (new form) or query param (legacy)
        cert_type = (cert_type or request.query_params.get("type", "approval")).lower()

        if cert_type == "activation":
            return self._verify_activation(request, certificate_id)
        return self._verify_approval(request, certificate_id)

    def _verify_approval(self, request, certificate_id):
        try:
            institution = Institution.objects.get(certificate_id=certificate_id)
        except Institution.DoesNotExist:
            return error_response(
                "Invalid or tampered certificate identifier.",
                code=status.HTTP_404_NOT_FOUND
            )

        cert_valid = _cert_status(institution.certificate_expires_at)

        return success_response("Certificate retrieved successfully.", data={
            "valid": cert_valid == "VALID",
            "cert_type": "approval",
            "cert_status": cert_valid,
            "institution": {
                "name": institution.name,
                "domain": institution.domain,
                "country": institution.country if hasattr(institution, "country") else "IN",
                "status": institution.status,
            },
            "certificate": {
                "id": str(institution.certificate_id),
                "serial": institution.certificate_serial,
                "fingerprint": institution.certificate_fingerprint,
                "issued_at": institution.certificate_issued_at.isoformat() if institution.certificate_issued_at else None,
                "expires_at": institution.certificate_expires_at.isoformat() if institution.certificate_expires_at else None,
                "authority": "AUIP Intermediate CA",
                "signature_algo": "SHA-256 with RSA-4096",
                "key_usage": ["digitalSignature", "contentCommitment"],
                "extended_key_usage": ["serverAuth", "emailProtection"],
                "trust_level": "PROVISIONAL",
                "pdf_url": request.build_absolute_uri(institution.certificate_url) if institution.certificate_url else None,
            },
            "chain": [
                {"name": "AUIP Root CA", "type": "root", "validity": "20 years"},
                {"name": "AUIP Intermediate CA", "type": "intermediate", "validity": "10 years"},
                {"name": institution.name, "type": "end-entity", "validity": "2 years"},
            ],
        })

    def _verify_activation(self, request, certificate_id):
        try:
            institution = Institution.objects.get(activation_cert_id=certificate_id)
        except Institution.DoesNotExist:
            return error_response(
                "Invalid or tampered sovereign certificate identifier.",
                code=status.HTTP_404_NOT_FOUND
            )

        cert_valid = _cert_status(institution.activation_cert_expires_at)

        return success_response("Sovereign certificate retrieved.", data={
            "valid": cert_valid == "VALID",
            "cert_type": "activation",
            "cert_status": cert_valid,
            "institution": {
                "name": institution.name,
                "domain": institution.domain,
                "country": institution.country if hasattr(institution, "country") else "IN",
                "status": institution.status,
            },
            "certificate": {
                "id": str(institution.activation_cert_id),
                "serial": institution.activation_cert_serial,
                "fingerprint": institution.activation_cert_fingerprint,
                "issued_at": institution.activation_cert_issued_at.isoformat() if institution.activation_cert_issued_at else None,
                "expires_at": institution.activation_cert_expires_at.isoformat() if institution.activation_cert_expires_at else None,
                "authority": "AUIP Intermediate CA",
                "signature_algo": "SHA-256 with RSA-4096",
                "key_usage": ["digitalSignature", "contentCommitment"],
                "extended_key_usage": ["clientAuth", "emailProtection", "codeSigning"],
                "trust_level": "SOVEREIGN",
                "pdf_url": request.build_absolute_uri(institution.activation_cert_url) if institution.activation_cert_url else None,
            },
            "chain": [
                {"name": "AUIP Root CA", "type": "root", "validity": "20 years"},
                {"name": "AUIP Intermediate CA", "type": "intermediate", "validity": "10 years"},
                {"name": institution.name, "type": "end-entity", "validity": "1 year"},
            ],
        })

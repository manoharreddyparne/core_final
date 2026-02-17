from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.urls import reverse
from django.conf import settings

signer = TimestampSigner(salt="activation-salt")

def generate_activation_token(institution_id, identifier, role):
    """
    Generates a cryptographically signed token for activation.
    Payload: "inst_id:identifier:role"
    """
    data = f"{institution_id}:{identifier}:{role}"
    return signer.sign(data)

def verify_activation_token(token, max_age=3600*24):
    """
    Verifies the activation token. Returns (institution_id, identifier, role) if valid.
    """
    try:
        data = signer.unsign(token, max_age=max_age)
        institution_id, identifier, role = data.split(":")
        return institution_id, identifier, role
    except (BadSignature, SignatureExpired, ValueError):
        return None

def get_activation_url(token, role=None):
    """
    Constructs the frontend activation URL.
    Routes institutional admins to their dedicated activation page.
    """
    if role == "ADMIN":
        return f"{settings.FRONTEND_URL}/auth/inst-admin/activate?token={token}"
    return f"{settings.FRONTEND_URL}/auth/activate?token={token}"

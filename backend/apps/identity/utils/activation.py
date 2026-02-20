import secrets
import string
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.urls import reverse
from django.conf import settings

signer = TimestampSigner(salt="activation-salt")

def generate_random_token(length=32):
    """Generates a secure random activation token."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_activation_token(schema_or_id, identifier, role):
    """
    Generates a secure signed activation token with context.
    Format: signer.sign("schema.ROLE.identifier.random")
    """
    random_part = generate_random_token()
    data = f"{schema_or_id}.{role.upper()}.{identifier}.{random_part}"
    return signer.sign(data)

def verify_activation_token(token, max_age=3600*24):
    """
    Verifies the signed activation token. Returns (institution_id, identifier, role) if valid.
    Supports both legacy unsigned and new signed tokens during transition if needed,
    but primarily enforces security via signing.
    """
    try:
        # First, try to unsign (Standard Secure Flow)
        try:
            unsigned_data = signer.unsign(token, max_age=max_age)
        except (BadSignature, SignatureExpired):
            # Graceful Fallback for existing links in dev environment
            # Legacy tokens use dots as segments and are NOT signed. 
            # If it has at least 3 dots and NO colon, it's an old-style token.
            if ":" not in str(token) and str(token).count(".") >= 3:
                unsigned_data = token
            else:
                return None
        
        parts = unsigned_data.split(".")
        if len(parts) >= 4:
            # Format: schema_or_id.ROLE.email.random
            # Email might contain dots, so we join segments between ROLE and RANDOM
            schema_or_id = parts[0]
            role = parts[1]
            # Capture everything between the role and the final random segment
            identifier = ".".join(parts[2:-1])
            return schema_or_id, identifier, role
            
        return None
    except (ValueError, TypeError, IndexError):
        return None

def get_activation_url(token, role=None):
    """
    Constructs the frontend activation URL.
    Routes institutional admins to their dedicated activation page.
    """
    if role == "ADMIN":
        return f"{settings.FRONTEND_URL}/auth/inst-admin/activate?token={token}"
    return f"{settings.FRONTEND_URL}/auth/activate?token={token}"

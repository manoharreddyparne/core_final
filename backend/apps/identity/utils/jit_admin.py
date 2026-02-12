import time
import hmac
import hashlib
import base64
from django.conf import settings

def generate_jit_admin_ticket(expires_in=900): # 15 minutes
    """
    Generates a time-limited ticket for Super Admin entry.
    """
    expiry = int(time.time()) + expires_in
    data = f"admin_jit_gate_{expiry}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    raw_payload = f"{expiry}:{signature}"
    return base64.urlsafe_b64encode(raw_payload.encode()).decode().rstrip("=")

def verify_jit_admin_ticket(ticket):
    """
    Verifies the JIT ticket and returns True if valid.
    """
    try:
        # Restore padding
        missing_padding = len(ticket) % 4
        if missing_padding:
            ticket += '=' * (4 - missing_padding)
            
        decoded = base64.urlsafe_b64decode(ticket.encode()).decode()
        expiry_str, signature = decoded.split(":")
        expiry = int(expiry_str)
        
        if time.time() > expiry:
            return False
            
        expected_data = f"admin_jit_gate_{expiry}"
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(),
            expected_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    except Exception:
        return False

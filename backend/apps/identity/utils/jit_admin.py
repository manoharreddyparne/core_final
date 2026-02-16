import time
import hmac
import hashlib
import base64
from django.conf import settings
from django.core.cache import cache

import logging

logger = logging.getLogger(__name__)

def generate_jit_admin_ticket(email, expires_in=900): # 15 minutes
    """
    Generates a time-limited ticket for Super Admin entry, bound to a specific email.
    Automatically burns any previous ticket to ensure strictly one active at a time.
    """
    email = email.lower().strip()
    
    # 1. Burn existing ticket if any
    old_ticket = cache.get("active_jit_admin_ticket")
    if old_ticket:
        logger.warning(f"[JIT-ROTATE] Invalidating previous ticket: {old_ticket[:10]}...")
        burn_jit_admin_ticket(old_ticket)

    # 2. Generate new ticket
    expiry = int(time.time()) + expires_in
    # Bind to email
    data = f"admin_jit_gate_{email}_{expiry}"
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Encode email into payload too for easier verification without extra lookups
    raw_payload = f"{email}:{expiry}:{signature}"
    ticket = base64.urlsafe_b64encode(raw_payload.encode()).decode().rstrip("=")
    
    # 3. Track as active
    cache.set("active_jit_admin_ticket", ticket, expires_in)
    
    logger.info(f"[JIT-GENERATE] Ticket created for {email} expiry={expiry}")
    return ticket

def burn_jit_admin_ticket(ticket):
    """
    Marks a ticket as used to prevent replay attacks.
    """
    cache.set(f"burned_jit_{ticket}", True, 900)
    logger.warning(f"[JIT-BURN] Ticket invalidated: {ticket[:10]}...")

def verify_jit_admin_ticket(ticket, email=None):
    """
    Verifies the JIT ticket and returns True if valid and NOT used.
    If email is provided, it MUST match the encoded email in the ticket.
    """
    if not ticket:
        logger.warning("[JIT-VERIFY] No ticket provided")
        return False
        
    # Check if ticket was already burned
    if cache.get(f"burned_jit_{ticket}"):
        logger.error(f"[JIT-VERIFY] Attempt to reuse burned ticket: {ticket[:10]}...")
        return False

    try:
        # Restore padding
        missing_padding = len(ticket) % 4
        if missing_padding:
            ticket += '=' * (4 - missing_padding)
            
        decoded = base64.urlsafe_b64decode(ticket.encode()).decode()
        # Shape: email:expiry:signature
        parts = decoded.split(":")
        if len(parts) != 3:
            logger.error(f"[JIT-VERIFY] Malformed ticket payload")
            return False
            
        encoded_email, expiry_str, signature = parts
        expiry = int(expiry_str)
        
        # Email Check (Strict)
        if email and email.lower().strip() != encoded_email.lower().strip():
            logger.error(f"[JIT-VERIFY] ❌ Identity Mismatch: Form={email} Ticket={encoded_email}")
            return False
            
        if time.time() > expiry:
            logger.error(f"[JIT-VERIFY] Ticket expired at {expiry} (current: {int(time.time())})")
            return False
            
        expected_data = f"admin_jit_gate_{encoded_email}_{expiry}"
        expected_signature = hmac.new(
            settings.SECRET_KEY.encode(),
            expected_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        is_valid = hmac.compare_digest(signature, expected_signature)
        if is_valid:
            logger.info(f"[JIT-VERIFY] ✅ Ticket verified for {encoded_email} expiry={expiry}")
        else:
            logger.error(f"[JIT-VERIFY] ❌ Signature mismatch for {encoded_email}")
            
        return is_valid
    except Exception as e:
        logger.error(f"[JIT-VERIFY] ❌ Critical failure during verification: {str(e)}")
        return False

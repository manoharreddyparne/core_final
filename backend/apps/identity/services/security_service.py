import logging
import time
from django.core.cache import cache
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

GLOBAL_IP_FAIL_KEY = "sec:ip_fail_v2:SEC_GATE:{ip}"
GLOBAL_IP_BLOCK_KEY = "sec:ip_block_v2:SEC_GATE:{ip}"
MAX_FAILURES = 5
BLOCK_DURATION = 600 # 10 minutes

def register_global_failure(ip, user_agent="unknown", identifier="unknown"):
    """
    Increments failure count for an IP. 
    Triggers lockout and incident reporting if threshold reached.
    """
    key = GLOBAL_IP_FAIL_KEY.format(ip=ip)
    count = cache.get(key, 0) + 1
    cache.set(key, count, timeout=3600) # Reset failure counter after 1 hour of silence
    
    logger.warning(f"[SECURITY] ⚠️ Global failure registered for IP {ip} (Attempt: {count}/{MAX_FAILURES})")
    
    if count >= MAX_FAILURES:
        _trigger_lockout(ip, user_agent, identifier, count)
    
    return count

def _trigger_lockout(ip, user_agent, identifier, count):
    """
    Sets the block entry in cache and dispatches the security incident report via email.
    """
    cache.set(GLOBAL_IP_BLOCK_KEY.format(ip=ip), True, timeout=BLOCK_DURATION)
    logger.error(f"[SECURITY] 🚨 PLATFORM-WIDE LOCKOUT: IP {ip} neutralized for {BLOCK_DURATION // 60}m.")
    
    # Send Incident Report to Root Admin
    try:
        admin_email = getattr(settings, "SUPER_ADMIN_EMAIL", None)
        if not admin_email:
            logger.error("[SECURITY] ❌ Cannot send incident report: SUPER_ADMIN_EMAIL not configured.")
            return

        subject = f"🚨 SECURITY INCIDENT: Sustained Authentication Breach ({int(time.time())})"
        message = (
            f"URGENT: AUIP Platform Security Guard has neutralized a sustained attack.\n\n"
            f"INTRA-GATE ANALYSIS:\n"
            f"-----------------------------------\n"
            f"Suspicious IP: {ip}\n"
            f"Target Account: {identifier}\n"
            f"Detection Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n"
            f"Sustained Failures: {count}\n"
            f"Client Signature: {user_agent}\n"
            f"-----------------------------------\n\n"
            f"COUNTER-MEASURE ACTION:\n"
            f"Status: IP BLACKLISTED\n"
            f"Effect: Access to all Auth Gateway nodes (Login, Registration, JIT) is revoked for {BLOCK_DURATION // 60} minutes.\n\n"
            f"System Node: AUIP-CORE-V2 // SECURITY-V2"
        )
        
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [admin_email],
            fail_silently=False
        )
        logger.info(f"[SECURITY] Incident report successfully dispatched to {admin_email}")
    except Exception as e:
        logger.error(f"[SECURITY] ❌ Failed to dispatch incident report: {e}")

def get_ip_lockout_status(ip):
    """
    Check if the given IP is currently neutralized and return remaining time.
    Returns: {"blocked": bool, "remaining": int}
    """
    ttl = cache.ttl(GLOBAL_IP_BLOCK_KEY.format(ip=ip))
    blocked = ttl is not None and ttl > 0
    return {
        "blocked": blocked,
        "remaining": max(0, ttl) if blocked else 0
    }

def is_ip_blocked(ip):
    """Returns remaining TTL of block if exists, else 0."""
    ttl = cache.ttl(GLOBAL_IP_BLOCK_KEY.format(ip=ip))
    return max(0, ttl) if ttl is not None else 0

def get_remaining_attempts(ip):
    """
    Returns the number of attempts left before lockout.
    """
    count = cache.get(GLOBAL_IP_FAIL_KEY.format(ip=ip), 0)
    return max(0, MAX_FAILURES - count)

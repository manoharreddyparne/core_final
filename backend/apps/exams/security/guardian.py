import logging
import re
from decouple import config
from django.core.cache import cache
from django.http import HttpResponseForbidden

logger = logging.getLogger(__name__)

class SecurityGuardianMiddleware:
    """
    ASEP Defensive Shield: Detects and blocks Kali Linux reconnaissance tools.
    Protects against: Nmap, LBD, Hping3, Nessus, and Brute Force.
    """
    # Patterns common across Kali tools (theHarvester, nmap, etc.)
    SUSPICIOUS_UA = re.compile(r'nmap|nessus|masscan|zgrab|wget|curl|hping3|sqlmap|nikto', re.I)
    
    DEFAULTS = {
        "THRESHOLD": config("RECON_BLOCK_THRESHOLD", default=100, cast=int),
        "HONEYPOT": config("HONEYPOT_ENABLED", default=True, cast=bool),
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        client_ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        accept_header = request.META.get('HTTP_ACCEPT', '')

        # 1. User Agent & Bot Signature Detection
        is_bot = self.SUSPICIOUS_UA.search(user_agent)
        is_headless = not accept_header or "WebDriver" in request.headers or "Headless" in user_agent
        
        if is_bot or is_headless:
            logger.warning(f"[SECURITY_ALERT] Bot/Headless detected: {user_agent} from {client_ip}")
            return HttpResponseForbidden("ASEP_RECON_BLOCKED: Neural Handshake Failed.")

        # 2. Browser Integrity Handshake (Defense against script-based automation/curl)
        path = request.path.lower()
        INFRASTRUCTURE_EXEMPTIONS = any(p in path for p in [
            '/api/users/public/institutions/', 
            '/api/users/public/site-config/',
            '/api/users/auth/config/',
            '/api/users/auth/admin/verify-ticket/'
        ])

        integrity_token = request.headers.get('X-ASEP-Integrity', '')
        if not INFRASTRUCTURE_EXEMPTIONS and not integrity_token.startswith("BI_"):
            logger.warning(f"[SECURITY_ALERT] Integrity failure from {client_ip} for {path}")
            return HttpResponseForbidden("ASEP_INTEGRITY_FAILURE: Direct API access prohibited.")

        # 3. Burst Detection (Against Zombie IPs)
        cache_key = f"ipp_{client_ip}"
        requests_count = cache.get(cache_key, 0)
        
        if requests_count > self.DEFAULTS["THRESHOLD"]:
            return HttpResponseForbidden("ASEP_THROTTLE: Burst limit exceeded.")
        
        cache.set(cache_key, requests_count + 1, 60) # 60 second window

        # 3. Block Suspicious Request Paths (Nessus/Brute Force)
        path = request.path.lower()
        
        # Allow legitimate auth config, but block other 'config' attempts
        is_legit_config = "/auth/config" in path
        
        if not is_legit_config and any(bad in path for bad in ['.php', '.env', 'phpmyadmin', 'config', 'solarwinds']):
            from .obfuscator import SecurityObfuscator
            return HttpResponseForbidden(SecurityObfuscator.get_honeypot_response(path))

        response = self.get_response(request)
        
        # 4. Anti-Fingerprinting Response Headers (Against LBD/WhatWeb)
        from .obfuscator import SecurityObfuscator
        response['Server'] = SecurityObfuscator.get_fake_server_header()
        response['X-ASEP-Shield'] = "Neural-Active"
        
        return response

import random
from decouple import config

class SecurityObfuscator:
    """
    Noise Injection Gateway: Misleads network scanners and recon tools.
    Provides fake fingerprints sourced from environmental configuration.
    """
    
    IDENTITY = config("FAKE_SERVER_IDENTITY", default="Neural-OS/ASEP-Node")
    
    @staticmethod
    def get_fake_server_header():
        """Returns the randomized server header to defeat 'lbd'."""
        return SecurityObfuscator.IDENTITY

    @staticmethod
    def inject_noise_tags():
        """Returns hidden HTML comments to confuse web scrapers."""
        noise = [
            f"<!-- DEBUG: NODE_{random.randint(100,999)} -->",
            "<!-- POLICY: DYNAMIC_BALANCING_ACTIVE -->",
            "<!-- TRACE: HOP_COUNT=1 -->"
        ]
        return random.choice(noise)

    @staticmethod
    def get_honeypot_response(path):
        """Generates look-alike responses for restricted paths."""
        if not config("HONEYPOT_ENABLED", default=True, cast=bool):
            return "Forbidden."
            
        honeypots = {
            "/solarwinds": "Access Denied: JIT Authorization required.",
            "/.env": "CRYPTO_LOCK: Error decrypting env signature.",
            "/config.php": "Runtime Error: DB_HOST unreachable."
        }
        return honeypots.get(path, "Forbidden.")

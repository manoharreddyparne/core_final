from django.conf import settings
from decouple import config

class CSPMiddleware:
    """
    Industry-Standard Content Security Policy Middleware.
    Dynamically builds connect-src from environment configuration.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Build connect-src from .env
        frontend_url = config("FRONTEND_URL", default="http://localhost:3000")
        backend_port = config("BACKEND_PORT", default="8000")
        
        self.connect_sources = [
            "'self'",
            f"ws://localhost:{backend_port}",
            f"http://localhost:{backend_port}",
            f"http://127.0.0.1:{backend_port}",
            frontend_url,
            "https://*.cloudflare.com",
        ]

    def __call__(self, request):
        response = self.get_response(request)
        
        directives = {
            "default-src": ["'self'", "https:"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://accounts.google.com", "blob:", "data:"],
            "connect-src": self.connect_sources,
            "frame-src": ["'self'", "https://challenges.cloudflare.com", "blob:", "data:"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:", "blob:", "https:", "https://lh3.googleusercontent.com"],
            "worker-src": ["'self'", "blob:"]
        }

        csp_header = "; ".join([f"{k} {' '.join(v)}" for k, v in directives.items()])
        response["Content-Security-Policy"] = csp_header
        
        # Essential security headers without overhead
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "SAMEORIGIN"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response

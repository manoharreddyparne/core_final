from django.conf import settings

class CSPMiddleware:
    """
    Industry-Standard Content Security Policy Middleware.
    Explicitly handles Blob Workers (Vite), Wasm (Turnstile), and Host whitelisting.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Define Policy
        directives = {
            "default-src": ["'self'"],
            "script-src": [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'", 
                "https://challenges.cloudflare.com", 
                "https://accounts.google.com",
                "blob:" # Required for Vite workers
            ],
            "connect-src": [
                "'self'", 
                "ws://localhost:8000", 
                "http://localhost:8000", 
                "https://challenges.cloudflare.com", 
                "https://accounts.google.com"
            ],
            "frame-src": [
                "'self'", 
                "https://challenges.cloudflare.com"
            ],
            "style-src": [
                "'self'", 
                "'unsafe-inline'", 
                "https://fonts.googleapis.com"
            ],
            "font-src": [
                "'self'", 
                "https://fonts.gstatic.com", 
                "data:"
            ],
            "img-src": [
                "'self'", 
                "data:", 
                "https://lh3.googleusercontent.com" # Google Profiles
            ],
            "worker-src": [
                "'self'", 
                "blob:" # Vite / Cloudflare workers
            ]
        }

        csp_header = "; ".join([f"{k} {' '.join(v)}" for k, v in directives.items()])
        response["Content-Security-Policy"] = csp_header
        
        # Additional Security Headers
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["Referrer-Policy"] = "same-origin"
        
        return response

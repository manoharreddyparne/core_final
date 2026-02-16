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
        
        # Optimized and compressed CSP for development stability
        directives = {
            "default-src": ["'self'", "https:"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://accounts.google.com", "blob:", "data:"],
            "connect-src": ["'self'", "ws://localhost:8000", "http://localhost:8000", "https://*.cloudflare.com"],
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

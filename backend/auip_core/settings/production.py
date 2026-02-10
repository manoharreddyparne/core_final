from .base import *
import dj_database_url

DEBUG = False

# Production Database (likely RDS or Supabase)
# DATABASE_URL should be set in environment
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=None),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Use production Redis (AWS ElastiCache or similar)
REDIS_URL = config('REDIS_URL', default=None)
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            },
        }
    }

# Security Headers
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

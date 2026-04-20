from .base import *
import dj_database_url

DEBUG = False

# Allowed Hosts from environment
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="*",
    cast=lambda v: [s.strip() for s in v.split(",")]
)

# Production Database (likely RDS or Supabase)
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=None),
        conn_max_age=600,
        conn_health_checks=True,
    )
}
# IMPORTANT: Override engine for django-tenants
DATABASES['default']['ENGINE'] = 'django_tenants.postgresql_backend'

# Use production Redis (Upstash)
REDIS_URL = config('REDIS_URL', default=None)
if REDIS_URL:
    # Upstash often uses rediss:// for SSL. django-redis handles it.
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_KWARGS": {
                    "ssl_cert_reqs": None  # Often needed for serverless SSL certificates
                }
            },
        }
    }
    # Also update Celery & Channels if needed
    CELERY_BROKER_URL = REDIS_URL
    CHANNEL_LAYERS["default"]["CONFIG"]["hosts"] = [REDIS_URL]

# Security Headers
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'

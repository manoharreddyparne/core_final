from .base import *

DEBUG = True

# By default, use settings from base.py (which uses .env / Supabase)
# We only override here if we want a SPECIFIC local docker DB.
# Since you want Supabase, we comment this out or use environment variables.

# If you want to switch back to Local Docker Postgres, uncomment this:
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": "auip_db",
#         "USER": "auip_user",
#         "PASSWORD": "auip_password_dev",
#         "HOST": "postgres",
#         "PORT": 5432,
#     }
# }

# Use environment-aware Redis (from base.py)
# Only override if you need specific dev-only settings
# CHANNEL_LAYERS is already set in base.py using REDIS_URL

# CACHES is already set in base.py using REDIS_URL
# We just ensure it doesn't ignore exceptions in dev if we want to debug
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://127.0.0.1:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": False,
        },
    }
}

# Disable secure cookies for local dev
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
JWT_AUTH_COOKIE_SECURE = False
REFRESH_COOKIE_SECURE = False

# -----------------------------
# GMAIL SMTP FOR DEVELOPMENT
# -----------------------------
# User intends to use Gmail for manual verification
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="your-email@gmail.com")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="your-app-password")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="AUIP <your-email@gmail.com>")

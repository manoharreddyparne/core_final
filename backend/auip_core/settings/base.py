from pathlib import Path
from decouple import config
from datetime import timedelta
import sys
import os
from cryptography.fernet import Fernet

# -----------------------------
# BASE DIR
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# -----------------------------
# SECRET & DEBUG
# -----------------------------
SECRET_KEY = config("DJANGO_SECRET_KEY")
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda v: [s.strip() for s in v.split(",")]
)

# -----------------------------
# INSTALLED APPS
# -----------------------------
# -----------------------------
# MULTI-TENANCY (Django-Tenants)
# -----------------------------
SHARED_APPS = (
    "django_tenants",  # mandatory
    "apps.auip_tenant", # holds the schema table
    "daphne",  # ✅ MUST be first for ASGI/Channels
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "channels",
    # Core Shared Services
    "apps.identity", # SuperAdmin & Global Users live here
    "apps.analytics", # Global Analytics
)

TENANT_APPS = (
    "django.contrib.contenttypes",
    "django.contrib.auth", # Tenants might need their own auth context
    "apps.auip_institution", # Tenant Specific Data (Students, Faculty)
    "apps.academic",
    "apps.quizzes",
    "apps.attempts",
    "apps.anti_cheat",
)

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "django_redis",
]

INSTALLED_APPS += THIRD_PARTY_APPS

TENANT_MODEL = "auip_tenant.Client"
TENANT_DOMAIN_MODEL = "auip_tenant.Domain"

DATABASE_ROUTERS = (
    "django_tenants.routers.TenantSyncRouter",
)

# -----------------------------
# SITE / AUTH
# -----------------------------
SITE_ID = 1
AUTH_USER_MODEL = "identity.User"

AUTHENTICATION_BACKENDS = (
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
)

# -----------------------------
# MIDDLEWARE
# -----------------------------
MIDDLEWARE = [
    "django_tenants.middleware.main.TenantMainMiddleware", # ✅ Dependency for Multi-Tenancy
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "apps.identity.middleware.AccessTokenSessionMiddleware",
    "apps.identity.middleware_csp.CSPMiddleware", # ✅ Advanced CSP Management
]

# -----------------------------
# SECURITY HEADERS (Professional Standard)
# -----------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
REFERRER_POLICY = "same-origin"
# Permissions-Policy
SECURE_REFERRER_POLICY = "same-origin"

# Modern Isolation Policies
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# -----------------------------
# REST FRAMEWORK
# -----------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.identity.authentication.SafeJWTAuthentication",
    ),
    # Default to open endpoints unless restricted per-view
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "EXCEPTION_HANDLER": "auip_core.utils.custom_exception_handler",
}


# -----------------------------
# SIMPLE JWT
# -----------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "VERIFYING_KEY": None,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": (
        "rest_framework_simplejwt.tokens.AccessToken",
        "rest_framework_simplejwt.tokens.RefreshToken",
    ),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}


## -----------------------------
# REFRESH COOKIE SETTINGS
# -----------------------------
if DEBUG:  
    REFRESH_COOKIE_NAME = "refresh_token_v2"      # dev: plain cookie (v2 to clear conflicts)
else:
    REFRESH_COOKIE_NAME = "__Host-refresh_token"  # prod: __Host- prefix required

JWT_AUTH_COOKIE = "access_token"
JWT_AUTH_REFRESH_COOKIE = REFRESH_COOKIE_NAME
REST_USE_JWT = True

# Cookie security & SameSite
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
JWT_AUTH_COOKIE_SECURE = not DEBUG
# Secure cookies only in production
REFRESH_COOKIE_SAMESITE = 'None'  # ✅ Allow cross-origin (port to port) local dev
REFRESH_COOKIE_SECURE = True   # ✅ Required for SameSite=None

REFRESH_COOKIE_PATH = "/"
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_AGE = SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))
REFRESH_COOKIE_MAX_AGE = int(REFRESH_COOKIE_AGE.total_seconds())

# -----------------------------
# CORS
# -----------------------------
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS", default="http://localhost:3000,http://localhost:5173"
).split(",")

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS", default="http://localhost:3000,http://localhost:5173"
).split(",")

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# -----------------------------
# ROOT & TEMPLATES
# -----------------------------
ROOT_URLCONF = "auip_core.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# -----------------------------
# WSGI / ASGI
# -----------------------------
WSGI_APPLICATION = "auip_core.wsgi.application"
ASGI_APPLICATION = "auip_core.asgi.application"

# -----------------------------
# DATABASE
# -----------------------------
DATABASES = {
    "default": {
        "ENGINE": "django_tenants.postgresql_backend",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT", cast=int),
        "TEST": {"NAME": None, "ATOMIC_REQUESTS": True},
    }
}

# -----------------------------
# PASSWORD VALIDATORS
# -----------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# -----------------------------
# INTERNATIONALIZATION
# -----------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# -----------------------------
# STATIC / MEDIA
# -----------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# -----------------------------
# ACCOUNT SETTINGS
# -----------------------------
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_VERIFICATION = "none"
LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "APP": {
            "client_id": config("GOOGLE_CLIENT_ID"),
            "secret": config("GOOGLE_CLIENT_SECRET"),
            "key": "",
        },
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "online"},
    }
}
SOCIALACCOUNT_ADAPTER = "apps.identity.adapters.GoogleJWTAdapter"
SOCIALACCOUNT_AUTO_SIGNUP = False
SOCIALACCOUNT_EMAIL_REQUIRED = True

# -----------------------------
# EMAIL
# -----------------------------
EMAIL_BACKEND = config("EMAIL_BACKEND")
EMAIL_HOST = config("EMAIL_HOST")
EMAIL_PORT = config("EMAIL_PORT", cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL")

# -----------------------------
# SECURITY HMAC
# -----------------------------
SECURITY_HMAC_KEYS = {
    "k1": config("SEC_HMAC_K1", default="placeholder_old_key"),
    "k2": config("SEC_HMAC_K2", default="placeholder_current_key"),
}
SECURITY_HMAC_CURRENT = config("SEC_HMAC_CURRENT_KEYID", default="k2")

# -----------------------------
# TEST/CI SETTINGS
# -----------------------------
if 'pytest' in sys.argv[0] or 'test' in sys.argv:
    DEBUG = True
    DATABASES['default'] = {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"] = timedelta(seconds=5)
    SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"] = timedelta(seconds=10)
    import django
    django.setup()

# -----------------------------
# GEO LOCATION
# -----------------------------
GEOIP_PATH = BASE_DIR / "geoip"

# -----------------------------
# CHANNELS LAYER
# -----------------------------
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [
                (config("REDIS_HOST", default="127.0.0.1"), int(config("REDIS_PORT", default=6379)))
            ]
        },
    }
}

# -----------------------------
# CACHES (Redis or fallback)
# -----------------------------
REDIS_URL = config("REDIS_URL", default="redis://127.0.0.1:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,
        },
    }
}
FERNET_KEY = config("FERNET_KEY", default=None)
fernet = Fernet(FERNET_KEY) if FERNET_KEY else None

# -----------------------------
# CLOUDFLARE TURNSTILE (CloudFlare.com Security)
# -----------------------------
# Used to verify humans during login/registration
TURNSTILE_SITE_KEY = config("TURNSTILE_SITE_KEY", default="")
TURNSTILE_SECRET_KEY = config("TURNSTILE_SECRET_KEY", default="")
TURNSTILE_ENABLED = config("TURNSTILE_ENABLED", default=False, cast=bool)

# -----------------------------
# SUPER ADMIN SECURITY
# -----------------------------
SUPER_ADMIN_EMAIL = config("SUPER_ADMIN_EMAIL", default="parnemanoharreddy19@gmail.com")

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
SECRET_KEY = config("DJANGO_SECRET_KEY", default="django-insecure-build-time-secret-key-12345")
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
    "apps.site_config",  # ✅ CMS — Landing page content managed by Super Admin
    "apps.intelligence", # ✅ AI Governance & Global Chat
    # Celery Task Infrastructure
    "django_celery_beat",    # Periodic task schedules stored in DB
    "django_celery_results", # Task result backend (queryable via admin)
)

TENANT_APPS = (
    "django.contrib.contenttypes",
    "django.contrib.auth", # Tenants might need their own auth context
    "apps.auip_institution", # Tenant Specific Data (Students, Faculty)
    "apps.academic",
    "apps.quizzes",
    "apps.attempts",
    "apps.anti_cheat",
    "apps.placement",
    "apps.notifications",
    "apps.governance",
    "apps.intelligence",
    "apps.resumes",
    "apps.core_brain",
    "apps.social",       # Re-located to Tenant for isolation
    "apps.chathub",      # Re-located to Tenant for isolation
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
PUBLIC_SCHEMA_URLCONF = "auip_core.urls"

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
    "corsheaders.middleware.CorsMiddleware", # Move to top
    "django_tenants.middleware.main.TenantMainMiddleware",
    "apps.identity.middleware.CertificateValidityMiddleware",
    "apps.identity.middleware_csp.CSPMiddleware", 
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "apps.identity.middleware.AccessTokenSessionMiddleware",
    "apps.identity.middleware.SilentRotationMiddleware",
    
    # AUIP Intelligence & Governance Hub
    "apps.core_brain.middleware.BehaviorTrackingMiddleware",
    "apps.core_brain.policy_middleware.GovernancePolicyMiddleware",
]

# -----------------------------
# SECURITY HEADERS (Managed via CSPMiddleware)
# -----------------------------
SECURE_BROWSER_XSS_FILTER = True
# X_FRAME_OPTIONS handled in middleware
# REFERRER_POLICY handled in middleware
# SECURE_CONTENT_TYPE_NOSNIFF handled in middleware

# Modern Isolation Policies
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin-allow-popups"

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
# SIMPLE JWT (RS256 Configuration)
# -----------------------------
PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAw5W0o94M11ffKeMgwl22Judpq0TYhBMJcXQpP+Kt7T5/pZMi
xnGNrbSCoyD75Z7Yz94o+UNqS+vVsq95Ve1W+Da6aBYBS9sAjsNYVAchy0udojhW
4YTBAIpu7lEEYAt8Q1oQxEcvcaKPspQhW2Yl5tUA0uuJQy/F5U6rTooybEpLH6uX
4gDtBhbwCAF2VQ4yMr5peIMoKJMVKSBaeUw4W5fM++emNGVXedxMOO7hapJaXf1N
ytY7pkmF3vw2VfHPTmN87ixVsdO3MYcHvjZMTjrou3/fZbjn+CInyvA4S6G4ME29
VSJjcNmS/HOCeRxBkHlKB4D1lpVYaVICug2QLQIDAQABAoIBAEXoHfNOPDfCHC1M
FdrzBNa98vp49oyqgz8Ofmnruy/nnVdQkmbskm/Ka8Ej2nU1xBf0N5/0dStixXSD
HLLWTLYWVaU7bEYxJm9gqhMKo40W32Zqjb84pIVtdX3v7kjoAgfOytxk9zO+H298
W7nf9l8dthgtgNfHXQv7hOZjJeenO37ZVMNcMTK4a7ZD1lA7a1+TffIbColx5FR5
AvwJfP4V0e+FHfIc4YL/ls/+WJssBryIC/gQBw7sjoHZh6ocUoBtkgOgwm7LhUO7
IEH9Hw4oibqlsx3pzVVVzdEjXW4sI2mqX3oTqhpmemL+oQNMJCN+a3iPe71l3hKd
99Bfz/8CgYEA+J9j9drQdH02XnAllYzylYjA2K4eeiTyy95SwolhdcXXYqa2UVjC
OP6SJ7XdSP7OhLBHMYCf2gXIi1cvP845uuK20L5jDgRLNSQaXEjuwJLi72npmJBq
SpnTXGsMOgKpLOqWw8+/JOxNJLif6tqHi8BkieOdShzU/QhQlGCgZWsCgYEAyWNs
pbV/YY7Xz2HX1srENrnyqfglg/5MlIWGXxdCwJ9ZXj9S4KlEwOwNF2K7/rrkmwBn
7Scw/JjMPXWC0SAC01kk4NmcOF26CU8hE2v/MRMwEDv1uEh6+imoOl9yLOEXsgh/
89Pl6sPGnLT15yYL2FA23AfQXc0LJH65z3VQrscCgYEA78mKt0xbUH6TOXIgTaSr
Mt26YUFN07BfG5FJcKbfgJ9XpKX1oW9ho2ajv/j/e6+FryP1BiFwCu8ZBIsJ3xgf
RcfzWlDFaHdrsc0oP2l4G/OPPCmCSsq+OUUzPSdhm3GFiPSYhDKRwCLIJGqMkg5C
PN9KGFOXGCvGoGSsku6+xBECgYBoGPCMJ2kUsJV1KQo8iMsrzqpUmWQq+kPzcaGn
fYqPrs6vHORmJJjZcCrEL9ElNs38IRWXTG7R4tmP2zInjvhm7ulVIKbTq/8B2Nks
BOMAJv7tJVE6VJzcurOumK+X6zIoYKRjEOEDnPcJAbEqLkxpH+17hr55/gcIckjx
p55w+QKBgQCEOQGOJz013sw1agrJV1i4PjNoMjHSpS/Lr4Cp0aVEoj8NHKVYiuE5
TwU7fD6vcPTkPT44j8tudSPiCsC9YlbXFar2vcQTbfRQdmZLWcePahY41mZgDL0J
zhcZfwl+H9YmwZgd+MV9wTSg1Zt4dcNOiBlnnOO9ai3mAvPhY+Xyzw==
-----END RSA PRIVATE KEY-----"""

PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw5W0o94M11ffKeMgwl22
Judpq0TYhBMJcXQpP+Kt7T5/pZMixnGNrbSCoyD75Z7Yz94o+UNqS+vVsq95Ve1W
+Da6aBYBS9sAjsNYVAchy0udojhW4YTBAIpu7lEEYAt8Q1oQxEcvcaKPspQhW2Yl
5tUA0uuJQy/F5U6rTooybEpLH6uX4gDtBhbwCAF2VQ4yMr5peIMoKJMVKSBaeUw4
W5fM++emNGVXedxMOO7hapJaXf1NytY7pkmF3vw2VfHPTmN87ixVsdO3MYcHvjZM
Tjrou3/fZbjn+CInyvA4S6G4ME29VSJjcNmS/HOCeRxBkHlKB4D1lpVYaVICug2Q
LQIDAQAB
-----END PUBLIC KEY-----"""

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "RS256",
    "SIGNING_KEY": PRIVATE_KEY,
    "VERIFYING_KEY": PUBLIC_KEY,
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
# Core cookie security settings (Shared by Quantum Shield)
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Secure cookies only in production
if DEBUG:
    REFRESH_COOKIE_SAMESITE = 'Lax'
    REFRESH_COOKIE_SECURE = False
else:
    REFRESH_COOKIE_SAMESITE = 'None'
    REFRESH_COOKIE_SECURE = True

REFRESH_COOKIE_PATH = "/"
REFRESH_COOKIE_HTTPONLY = True
REFRESH_COOKIE_AGE = SIMPLE_JWT.get("REFRESH_TOKEN_LIFETIME", timedelta(days=7))
REFRESH_COOKIE_MAX_AGE = int(REFRESH_COOKIE_AGE.total_seconds())

# -----------------------------
# CORS & CSRF (Development Resilience)
# -----------------------------
CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    # Blanket permission for local development to prevent origin mismatch lockouts
    CORS_ALLOW_ALL_ORIGINS = True
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:3000"
    ]
else:
    CORS_ALLOW_ALL_ORIGINS = False
    _CORS_BASE = config("CORS_ALLOWED_ORIGINS", default="").split(",")
    CORS_ALLOWED_ORIGINS = [o for o in _CORS_BASE if o]
    
    _CSRF_BASE = config("CSRF_TRUSTED_ORIGINS", default="").split(",")
    CSRF_TRUSTED_ORIGINS = [o for o in _CSRF_BASE if o]

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
DATABASE_URL = config("DATABASE_URL", default=None)

if DATABASE_URL:
    import urllib.parse as urlparse
    url = urlparse.urlparse(DATABASE_URL)
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": url.path[1:],
            "USER": url.username,
            "PASSWORD": url.password,
            "HOST": url.hostname,
            "PORT": url.port,
            "TEST": {"NAME": None, "ATOMIC_REQUESTS": True},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django_tenants.postgresql_backend",
            "NAME": config("DB_NAME", default="postgres"),
            "USER": config("DB_USER", default="postgres"),
            "PASSWORD": config("DB_PASSWORD", default=""),
            "HOST": config("DB_HOST", default="127.0.0.1"),
            "PORT": config("DB_PORT", cast=int, default=5432),
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
            "client_id": config("GOOGLE_CLIENT_ID", default=""),
            "secret": config("GOOGLE_CLIENT_SECRET", default=""),
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
EMAIL_BACKEND = config("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = config("EMAIL_HOST", default="localhost")
EMAIL_PORT = config("EMAIL_PORT", cast=int, default=587)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", cast=bool, default=True)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="webmaster@localhost")

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
            "hosts": [config("REDIS_URL", default="redis://127.0.0.1:6379/0")],
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

# -----------------------------
# AI & INTELLIGENCE
# -----------------------------
# --- AI ENGINE CONFIGURATION ---
LLM_PROVIDER = config("LLM_PROVIDER", default="gemini") # choices: gemini, groq, openai_compatible
LLM_API_BASE = config("LLM_API_BASE", default="http://localhost:11434/v1") # Default for Ollama
LLM_MODEL = config("LLM_MODEL", default="llama3")
LLM_API_KEY = config("LLM_API_KEY", default="ollama") # Often 'ollama' or 'lm-studio'
GEMINI_API_KEY = config("GEMINI_API_KEY", default="your_gemini_api_key_here")
GROQ_API_KEY = config("GROQ_API_KEY", default=None)

# ─────────────────────────────────────────────────────────────
# CELERY CONFIGURATION
# Broker & Result Backend: Redis (same as Channels)
# Prod switch: change REDIS_URL in .env → no code changes needed
# ─────────────────────────────────────────────────────────────
CELERY_BROKER_URL = config("REDIS_URL", default="redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = "django-db"          # stored in DB, queryable via admin
CELERY_CACHE_BACKEND  = "django-cache"        # fallback cache backend
CELERY_RESULT_EXTENDED = True                 # store args, kwargs, traceback in result
CELERY_TASK_SERIALIZER   = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT    = ["json"]
CELERY_TIMEZONE          = "UTC"
CELERY_ENABLE_UTC        = True
CELERY_TASK_ACKS_LATE          = True  # only ack after task completes (retry-safe)
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # one task/slot — fair for heavy RSA key generation
CELERY_TASK_TRACK_STARTED = True

# Beat uses DB scheduler so schedules survive restarts
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"

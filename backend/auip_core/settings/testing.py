# auip_core/settings/testing.py
# ─────────────────────────────────────────────────────────────────────────────
# Test settings for running Django tests without full tenant/postgres setup.
# Uses SQLite in-memory for speed. All SHARED + TENANT apps merged so admin
# and other shared apps are properly registered.
# Usage: python manage.py test --settings=auip_core.settings.testing
# ─────────────────────────────────────────────────────────────────────────────
from .base import *  # noqa

DEBUG = True

# ─── Override: flat INSTALLED_APPS so django.contrib.admin is visible ─────────
# django-tenants splits SHARED_APPS and TENANT_APPS, which breaks the test
# runner because it can't find 'admin' as an isolated app label.
# In test mode we use a flat list and a standard (non-tenant) PostgreSQL backend.
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third party
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
    # AUIP apps
    "apps.identity",
    "apps.auip_tenant",
    "apps.auip_institution",
    "apps.academic",
    "apps.quizzes",
    "apps.attempts",
    "apps.anti_cheat",
    "apps.placement",
    "apps.notifications",
    "apps.governance",
    "apps.intelligence",
    "apps.social",
    "apps.resumes",
    "apps.core_brain",
    "apps.analytics",
    "apps.site_config",
]

# ─── Override: Standard PostgreSQL (no tenant backend) ───────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="postgres"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="db"),  # 'db' = docker service name
        "PORT": config("DB_PORT", cast=int, default=5432),
        "TEST": {
            "NAME": "test_auip_academic",
        },
    }
}

# ─── Override: Remove tenant-specific middleware that breaks tests ───────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

# ─── Override: No tenant router ───────────────────────────────────────────────
DATABASE_ROUTERS = []

# ─── Speed: Use fast password hasher ─────────────────────────────────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# ─── Speed: Disable cache ─────────────────────────────────────────────────────
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}

# ─── Speed: Disable email sending ────────────────────────────────────────────
EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"

# ─── No Channels needed in tests ─────────────────────────────────────────────
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# ─── Fix: Disable tenant middleware ──────────────────────────────────────────
TENANT_MODEL = "auip_tenant.Client"
TENANT_DOMAIN_MODEL = "auip_tenant.Domain"

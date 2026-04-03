from .base import *  # noqa

DEBUG = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "channels",
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
    "django_celery_beat",
    "django_celery_results",
    "apps.identity",
    "apps.auip_tenant",
    "apps.auip_institution",
    "apps.academic",
    "apps.exams",
    "apps.placement",
    "apps.projects",
    "apps.notifications",
    "apps.governance",
    "apps.intelligence",
    "apps.social",
    "apps.resumes",
    "apps.core_brain",
    "apps.analytics",
    "apps.site_config",
    "apps.chathub",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "test.sqlite3",
    }
}

DATABASE_ROUTERS = []

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

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

TENANT_MODEL = "auip_tenant.Client"
TENANT_DOMAIN_MODEL = "auip_tenant.Domain"

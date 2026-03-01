"""
AUIP Celery Application
Broker  : Redis (same instance used by Channels)
Backend : Django DB (django-celery-results) — task state is queryable
Beat    : django_celery_beat DatabaseScheduler — schedules stored in DB, editable via admin

Switching local → production:
  .env: REDIS_URL=redis://<prod-redis-host>:6379/0
  That's it. No code changes needed.
"""

import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")

app = Celery("auip_core")

# Pull config from Django settings, namespace CELERY_ so there are no collisions
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all INSTALLED_APPS
app.autodiscover_tasks()


# ─── Periodic Beat Schedule ───────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Daily at 08:00 UTC — check for certificates expiring in 30 or 7 days
    "daily-certificate-expiry-check": {
        "task": "apps.identity.tasks.check_expiring_certificates",
        "schedule": crontab(hour=8, minute=0),
        "options": {"queue": "certificates"},
    },
}

app.conf.task_routes = {
    "apps.identity.tasks.send_approval_certificate_email_task": {"queue": "certificates"},
    "apps.identity.tasks.send_activation_certificate_email_task": {"queue": "certificates"},
    "apps.identity.tasks.send_expiry_warning_email_task": {"queue": "emails"},
    "apps.identity.tasks.check_expiring_certificates": {"queue": "certificates"},
}

app.conf.task_serializer = "json"
app.conf.result_serializer = "json"
app.conf.accept_content = ["json"]
app.conf.timezone = "UTC"
app.conf.enable_utc = True
app.conf.task_acks_late = True          # task only acked after completion (safe for retries)
app.conf.worker_prefetch_multiplier = 1 # one task at a time per worker slot (fair for heavy PKI work)

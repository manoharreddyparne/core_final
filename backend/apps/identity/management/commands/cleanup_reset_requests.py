# users/management/commands/cleanup_reset_requests.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from users.models import PasswordResetRequest

class Command(BaseCommand):
    help = "Cleanup expired or long-unused password reset requests."

    def handle(self, *args, **options):
        # Remove unused reset requests older than X days (configurable here)
        expiry_days = 2
        cutoff = timezone.now() - timedelta(days=expiry_days)
        qs = PasswordResetRequest.objects.filter(used=False, created_at__lt=cutoff)
        count = qs.count()
        qs.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} expired/unused PasswordResetRequest(s)."))

# users/management/commands/cleanup_expired_sessions.py

import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.identity.models import LoginSession

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Remove expired login sessions older than specified days (default: 30)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete sessions older than this many days (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find expired sessions older than cutoff
        expired_sessions = LoginSession.objects.filter(
            is_active=False,
            last_active__lt=cutoff_date
        )
        
        count = expired_sessions.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"DRY RUN: Would delete {count} expired sessions older than {days} days"
                )
            )
            if count > 0:
                self.stdout.write("\nSample sessions to be deleted:")
                for session in expired_sessions[:5]:
                    self.stdout.write(
                        f"  - Session {session.id} | User: {session.user.email} | "
                        f"Last active: {session.last_active}"
                    )
        else:
            deleted_count = expired_sessions.delete()[0]
            self.stdout.write(
                self.style.SUCCESS(
                    f"Successfully deleted {deleted_count} expired sessions older than {days} days"
                )
            )
            logger.info(f"Cleaned up {deleted_count} expired login sessions")

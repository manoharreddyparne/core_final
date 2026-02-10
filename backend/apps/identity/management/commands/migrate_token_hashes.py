# users/management/commands/migrate_token_hashes.py
from django.core.management.base import BaseCommand
from apps.identity.models.auth_models import LoginSession, BlacklistedAccessToken
from apps.identity.utils.security import hash_token

class Command(BaseCommand):
    help = "Migrate old token hashes to new HMAC format"

    def handle(self, *args, **options):
        # Migrate LoginSession hashes
        sessions = LoginSession.objects.all()
        for s in sessions:
            if s.token_hash and "$" not in s.token_hash:  # old format
                s.token_hash = hash_token(str(s.token_hash))  # re-hash
                if s.refresh_token_hash:
                    s.refresh_token_hash = hash_token(str(s.refresh_token_hash))
                s.save(update_fields=["token_hash", "refresh_token_hash"])
        self.stdout.write(self.style.SUCCESS(f"Migrated {sessions.count()} LoginSession hashes"))

        # Migrate BlacklistedAccessToken hashes
        tokens = BlacklistedAccessToken.objects.all()
        for t in tokens:
            if t.token_hash and "$" not in t.token_hash:
                t.token_hash = hash_token(str(t.token_hash))
                t.save(update_fields=["token_hash"])
        self.stdout.write(self.style.SUCCESS(f"Migrated {tokens.count()} BlacklistedAccessToken hashes"))

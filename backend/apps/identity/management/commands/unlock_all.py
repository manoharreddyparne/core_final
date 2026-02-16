from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.conf import settings
import redis

class Command(BaseCommand):
    help = 'Aggressively clears all security-related keys from Redis/Cache'

    def handle(self, *args, **options):
        self.stdout.write("Initializing Security Purge...")
        
        # Method 1: Django Cache Pattern Delete
        try:
            # Most redis backends support delete_pattern
            if hasattr(cache, 'delete_pattern'):
                count_block = cache.delete_pattern("sec:ip_block_v2:*")
                count_fail = cache.delete_pattern("sec:ip_fail_v2:*")
                self.stdout.write(f"Django Cache: Cleared {count_block} blocks and {count_fail} failures.")
            else:
                self.stdout.write("Django Cache does not support delete_pattern.")
        except Exception as e:
            self.stdout.write(f"Django Cache Error: {e}")

        # We'll try common DB indices just in case
        for db_index in range(16):
            try:
                r = redis.Redis(host='127.0.0.1', port=6379, db=db_index)
                keys_deleted = 0
                patterns = [
                    ":1:sec:ip_fail_v2*",
                    ":1:sec:ip_block_v2*",
                    ":1:bf:*",
                    ":1:*:otp:*",
                    ":1:reset_block:*",
                    ":1:reset_attempts:*"
                ]
                for pattern in patterns:
                    keys = r.keys(pattern)
                    if keys:
                        r.delete(*keys)
                        keys_deleted += len(keys)
                
                if keys_deleted > 0:
                    self.stdout.write(self.style.SUCCESS(f"DB {db_index}: Purged {keys_deleted} security keys."))
            except Exception as e:
                # Skip DBs that don't exist or connect
                continue

        self.stdout.write(self.style.SUCCESS("UNIVERSAL SECURITY PURGE COMPLETE."))

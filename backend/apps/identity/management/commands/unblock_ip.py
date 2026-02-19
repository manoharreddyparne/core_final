"""
Management command: unblock_ip
-------------------------------
Clears ALL security locks for a given IP (or all IPs if --all is passed).
For development/testing use only.

Usage:
    python manage.py unblock_ip 127.0.0.1
    python manage.py unblock_ip 172.18.0.1
    python manage.py unblock_ip --all
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from apps.identity.services.security_service import clear_global_failures
from apps.identity.services.brute_force_service import clear_failed_attempt
from django.conf import settings


class Command(BaseCommand):
    help = "Clear all security locks (IP block, failure counters, JIT burst) for a given IP."

    def add_arguments(self, parser):
        parser.add_argument(
            "ip",
            nargs="?",
            type=str,
            help="IP address to unblock (e.g. 127.0.0.1 or 172.18.0.1)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Clear ALL cache-based security locks (nuclear option).",
        )
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help="Also clear brute-force counter for this email identifier.",
        )

    def handle(self, *args, **options):
        do_all = options["all"]
        ip = options.get("ip")
        email = options.get("email") or getattr(settings, "SUPER_ADMIN_EMAIL", None)

        if not ip and not do_all:
            self.stderr.write(self.style.ERROR(
                "Please provide an IP address or use --all.\n"
                "Example: python manage.py unblock_ip 127.0.0.1"
            ))
            return

        if do_all:
            self.stdout.write(self.style.WARNING("Nuclear option: flushing all cache-based security locks..."))
            # We can't enumerate keys in all cache backends without scanning,
            # so we clear the known key patterns for common dev IPs.
            dev_ips = ["127.0.0.1", "172.18.0.1", "172.17.0.1", "::1", "localhost"]
            for dev_ip in dev_ips:
                self._clear_ip(dev_ip, email)
            self.stdout.write(self.style.SUCCESS("Done. All common dev IPs unblocked."))
            return

        self._clear_ip(ip, email)

    def _clear_ip(self, ip: str, email: str | None):
        # 1. Global IP block + failure counter
        clear_global_failures(ip)
        self.stdout.write(f"  [+] Global IP block cleared for {ip}")

        # 2. Brute force counter (email-based)
        if email:
            clear_failed_attempt(email, ip)
            self.stdout.write(f"  [+] Brute-force counter cleared for {email}@{ip}")

        # 3. JIT burst cooldown (per email)
        if email:
            jit_burst_key = f"jit_burst_{email.lower().strip()}"
            cache.delete(jit_burst_key)
            self.stdout.write(f"  [+] JIT burst cooldown cleared for {email}")

        # 4. OTP session key (if any user is mid-flow)
        # We can't know the user ID here, but if email is known we can look it up
        if email:
            try:
                from apps.identity.models import User
                user = User.objects.filter(email__iexact=email).first()
                if user:
                    cache.delete(f"jit_otp_session:{user.id}")
                    self.stdout.write(f"  [+] JIT OTP session cleared for user_id={user.id}")
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS(f"  => IP {ip} fully unblocked.\n"))

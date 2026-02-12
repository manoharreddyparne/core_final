from django.core.management.base import BaseCommand
from apps.identity.utils.jit_admin import generate_jit_admin_ticket
from django.conf import settings

class Command(BaseCommand):
    help = "Generates a JIT (Just-In-Time) access URL for the Super Admin Gateway."

    def handle(self, *args, **options):
        ticket = generate_jit_admin_ticket()
        base_url = "http://localhost:3000"
        jit_url = f"{base_url}/auth/secure-gateway?ticket={ticket}"
        
        self.stdout.write(self.style.SUCCESS("--- AUTHENTICATED JIT GATE GENERATED ---"))
        self.stdout.write(self.style.WARNING(f"Ticket valid for 15 minutes."))
        self.stdout.write(self.style.SUCCESS(f"URL: {jit_url}"))
        self.stdout.write(self.style.SUCCESS("--- KEEP THIS LINK CONFIDENTIAL ---"))

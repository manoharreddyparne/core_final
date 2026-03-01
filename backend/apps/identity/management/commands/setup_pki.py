"""
Management command: setup_pki
Run ONCE during system setup to generate the Root CA and Intermediate CA.

Usage:
    python manage.py setup_pki
    python manage.py setup_pki --force   (regenerate even if already exists)
"""

from django.core.management.base import BaseCommand
from apps.identity.services.certificates.pki import (
    generate_root_ca,
    generate_intermediate_ca,
    ROOT_CA_CERT_PATH,
    INTER_CA_CERT_PATH,
)


class Command(BaseCommand):
    help = "Generate the AUIP Root CA and Intermediate CA for the PKI system. Run ONCE during setup."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate CA even if it already exists (DANGEROUS in production)",
        )

    def handle(self, *args, **options):
        force = options["force"]

        self.stdout.write(self.style.WARNING("\nPKI Setup"))
        self.stdout.write("=" * 50)

        if ROOT_CA_CERT_PATH.exists() and not force:
            self.stdout.write(self.style.SUCCESS(f"Root CA already exists at: {ROOT_CA_CERT_PATH}"))
        else:
            self.stdout.write("  Generating Root CA (RSA-4096, 20yr)...")
            generate_root_ca(force=force)
            self.stdout.write(self.style.SUCCESS(f"  Root CA generated -> {ROOT_CA_CERT_PATH}"))

        if INTER_CA_CERT_PATH.exists() and not force:
            self.stdout.write(self.style.SUCCESS(f"Intermediate CA already exists at: {INTER_CA_CERT_PATH}"))
        else:
            self.stdout.write("  Generating Intermediate CA (RSA-4096, 10yr, signed by Root CA)...")
            generate_intermediate_ca(force=force)
            self.stdout.write(self.style.SUCCESS(f"  Intermediate CA generated -> {INTER_CA_CERT_PATH}"))

        self.stdout.write("")
        self.stdout.write(self.style.WARNING("KEEP THE PKI DIRECTORY SECURE AND EXCLUDED FROM GIT."))
        self.stdout.write("   Root CA key: mediafiles/pki/root_ca.key")
        self.stdout.write("   Intermediate CA key: mediafiles/pki/intermediate_ca.key")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("PKI setup complete. Institution certificates can now be issued."))

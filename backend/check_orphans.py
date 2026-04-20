import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_tenant.models import Client, Domain

def check_orphans():
    print("--- Checking for Orphaned Institutions (Missing Client records) ---")
    approved = Institution.objects.filter(status=Institution.RegistrationStatus.APPROVED).exclude(schema_name__isnull=True).exclude(schema_name='')
    
    for inst in approved:
        client = Client.objects.filter(schema_name=inst.schema_name).first()
        if not client:
            print(f"  Institution ORPHANED: {inst.name} (Schema: {inst.schema_name}) - MISSING 'Client' entry!")
        else:
            domain_exists = Domain.objects.filter(tenant=client).exists()
            if not domain_exists:
                print(f"  Institution INCORRECT: {inst.name} (Schema: {inst.schema_name}) - MISSING 'Domain' entry!")
            else:
                print(f"  Institution OK: {inst.name} (Schema: {inst.schema_name})")

if __name__ == "__main__":
    check_orphans()

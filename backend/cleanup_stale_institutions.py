
import os
import django
import sys

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_tenant.models import Client

def cleanup_stale_institutions():
    print(">> Cleaning up Stale Institutions...")
    
    # Get valid schema names from Clients
    valid_schemas = set(Client.objects.values_list('schema_name', flat=True))
    print(f">> Valid Schemas: {valid_schemas}")

    # Find Institutions with invalid schemas or no schema (if that's considered stale)
    # We'll strictly keep only those matching valid tenants, assuming every inst needs a tenant.
    
    deleted_count = 0
    for inst in Institution.objects.all():
        if inst.schema_name not in valid_schemas:
            print(f"   - Deleting stale: {inst.name} (Schema: {inst.schema_name})")
            inst.delete()
            deleted_count += 1
        else:
            print(f"   + Keeping valid: {inst.name} (Schema: {inst.schema_name})")

    print(f">> Cleanup Complete. Deleted {deleted_count} stale records.")

if __name__ == "__main__":
    cleanup_stale_institutions()

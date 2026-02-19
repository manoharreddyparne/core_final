import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_tenant.models import Client, Domain
from django.db import connection

def nuke_all_institutions():
    print("Starting Global Institutional Cleanup...")
    
    # Clean up Tenant records first
    print("Clearing Tenant registry...")
    Domain.objects.exclude(tenant__schema_name='public').delete()
    Client.objects.exclude(schema_name='public').delete()
    
    institutions = Institution.objects.all()
    count = institutions.count()
    
    for inst in institutions:
        schema = inst.schema_name
        print(f"--- Processing {inst.name} (Schema: {schema}) ---")
        
        # 1. Drop Schema if exists
        if schema and schema != 'public':
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE;')
                print(f"DONE: Dropped schema: {schema}")
            except Exception as e:
                print(f"FAIL: Failed to drop schema {schema}: {e}")
        
        # 2. Delete Institution Record
        inst.delete()
        print(f"DONE: Deleted institution record: {inst.name}")

    # 3. Double check for orphaned inst_ schemas
    print("\nChecking for orphaned schemas...")
    with connection.cursor() as cursor:
        cursor.execute("SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname LIKE 'inst_%';")
        orphans = cursor.fetchall()
        for (orphan,) in orphans:
            try:
                cursor.execute(f'DROP SCHEMA IF EXISTS "{orphan}" CASCADE;')
                print(f"NUKED orphaned schema: {orphan}")
            except Exception as e:
                print(f"FAIL: Failed to nuke orphan {orphan}: {e}")

    print(f"\nCleanup Complete. Removed {count} institutions.")

if __name__ == "__main__":
    nuke_all_institutions()

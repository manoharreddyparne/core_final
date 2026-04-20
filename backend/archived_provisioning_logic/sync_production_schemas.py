
import os
import sys
from pathlib import Path
from django.conf import settings
from django.core.management import call_command
from django.db import connection, transaction
import django
import logging

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

logger = logging.getLogger(__name__)

def sync_all_schemas():
    """
    The 'Amazon' SOTA approach:
    1. Update the 'Golden Template' schema so it's ready for instant cloning.
    2. Sequentially update all existing 'Active' institutions.
    """
    print("--- [AUIP SOTA SYNC] Initializing Global Schema Update ---")
    
    # 1. Ensure the Golden Template exists and is up to date
    # This template is used for EXTREME SPEED during new institutional provisioning.
    template_schema = "template_tenant"
    
    with connection.cursor() as cursor:
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {template_schema};")
    
    print(f"1. Updating Golden Template: {template_schema}...")
    try:
        call_command('migrate_schemas', tenant=True, schema=template_schema, interactive=False, verbosity=1)
        print("   [OK] Template Schema Updated.")
        
        # 🚀 REGENERATE BLUEPRINT FROM UPDATED TEMPLATE
        from scripts.generate_tenant_blueprint import generate_blueprint
        print("   Updating Blueprint SQL file...")
        generate_blueprint(source_schema=template_schema)
        print("   [OK] Blueprint Synchronized.")
        
    except Exception as e:
        print(f"   [ERROR] Template/Blueprint Update Failed: {e}")
        return

    # 2. Update all real institutions
    print(f"2. Syncing all existing institution schemas...")
    from apps.auip_tenant.models import Client
    clients = Client.objects.exclude(schema_name__in=['public', template_schema])
    
    for client in clients:
        print(f"   Syncing {client.schema_name}...")
        try:
            call_command('migrate_schemas', tenant=True, schema=client.schema_name, interactive=False, verbosity=1)
            print(f"   [OK] {client.schema_name} is up to date.")
        except Exception as e:
            print(f"   [SKIPPED] {client.schema_name} failed: {e}")

    print("\n--- GLOBAL SYNC COMPLETE ---")

if __name__ == "__main__":
    sync_all_schemas()

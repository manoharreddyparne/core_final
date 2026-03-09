import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model

def get_state(schema):
    with schema_context(schema):
        with connection.cursor() as cursor:
            # Check column
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'placement_placementdrive' 
                AND column_name = 'included_rolls'
            """)
            has_col = cursor.fetchone() is not None
            
            # Check migration
            cursor.execute("SELECT id FROM django_migrations WHERE app = 'placement' AND name = '0007_placementdrive_included_rolls_and_more'")
            has_mig = cursor.fetchone() is not None
            
            return has_col, has_mig

tenants = get_tenant_model().objects.all()
schemas = [t.schema_name for t in tenants] # Placement is a tenant app

for s in schemas:
    try:
        has_col, has_mig = get_state(s)
        print(f"Schema: {s:25} | Column: {has_col} | Migration: {has_mig}")
        
        # If Has Column but No Migration Record -> FAKE IT
        if has_col and not has_mig:
            print(f"  --> Faking 0007 for {s}")
            with schema_context(s):
                from django.core.management import call_command
                call_command('migrate', 'placement', '0007', fake=True, verbosity=0)
                print(f"  DONE.")
    except Exception as e:
        print(f"Schema: {s:25} | Error: {e}")


import os
import django
import sys
from django.db import connection

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

def cleanup_schemas():
    print(">> Starting Orphaned Schema Cleanup...")
    
    with connection.cursor() as cursor:
        # Get all schemas
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'inst_%'")
        schemas = [row[0] for row in cursor.fetchall()]
        
        print(f">> Found {len(schemas)} schemas to potentially drop: {schemas}")
        
        for schema in schemas:
            # Drop schema cascade
            print(f">> Dropping schema: {schema} ...")
            try:
                cursor.execute(f'DROP SCHEMA "{schema}" CASCADE;')
                print(f"   - Dropped {schema}")
            except Exception as e:
                print(f"   !! Failed to drop {schema}: {e}")

    print(">> Cleanup Complete.")

if __name__ == "__main__":
    cleanup_schemas()

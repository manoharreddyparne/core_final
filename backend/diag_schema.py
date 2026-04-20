import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def diag(schema_name):
    print(f"--- Diagnosing schema: {schema_name} ---")
    try:
        with schema_context(schema_name):
            cursor = connection.cursor()
            cursor.execute("SELECT app, name FROM django_migrations WHERE app IN ('auip_institution', 'governance') ORDER BY app, name")
            print("Status for relevant apps:")
            for row in cursor.fetchall():
                print(f"  - {row[0]}: {row[1]}")
    except Exception as e:
        print(f"Error checking {schema_name}: {e}")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else 'public'
    diag(name)

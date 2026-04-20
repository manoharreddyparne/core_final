import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def list_all_tables(schema_name):
    print(f"--- Listing all tables in schema: {schema_name} ---")
    try:
        with schema_context(schema_name):
            cursor = connection.cursor()
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s ORDER BY table_name", [schema_name])
            for row in cursor.fetchall():
                print(f"  - {row[0]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else 'public'
    list_all_tables(name)

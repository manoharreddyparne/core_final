import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def diag_all(schema_name):
    print(f"--- Diagnosing schema: {schema_name} ---")
    try:
        with schema_context(schema_name):
            cursor = connection.cursor()
            
            # Check migrations
            print("\n[MIGRATIONS]")
            cursor.execute("SELECT app, MAX(name) FROM django_migrations GROUP BY app ORDER BY app")
            for row in cursor.fetchall():
                print(f"  - {row[0]}: {row[1]}")
            
            # Check tables
            print("\n[TABLES (auip_institution)]")
            cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE 'auip_institution_%%'", [schema_name])
            tables = cursor.fetchall()
            if tables:
                for row in tables:
                    print(f"  - {row[0]}")
            else:
                print("  (No auip_institution tables found)")
    except Exception as e:
        print(f"Error checking {schema_name}: {e}")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else 'public'
    diag_all(name)

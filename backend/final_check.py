import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def check(schema_name):
    print(f"--- CHECKING {schema_name} ---")
    with schema_context(schema_name):
        cursor = connection.cursor()
        cursor.execute("SELECT DISTINCT app FROM django_migrations ORDER BY app")
        print("Apps with migrations:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}")
            
        cursor.execute("SELECT name FROM django_migrations WHERE app='auip_institution'")
        names = cursor.fetchall()
        print(f"\n[auip_institution] found {len(names)} migrations:")
        for n in names:
            print(f"  - {n[0]}")

if __name__ == "__main__":
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else 'inst_mrgi'
    try:
        check(name)
    except Exception as e:
        print(f"Error checking {name}: {e}")

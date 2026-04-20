
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def list_all_schemas():
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')")
        schemas = [row[0] for row in cursor.fetchall()]
        print("Existing Schemas in DB:")
        for s in schemas:
            print(f" - {s}")

if __name__ == "__main__":
    list_all_schemas()

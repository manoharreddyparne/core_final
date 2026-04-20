
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def check_schemas():
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata")
        schemas = [s[0] for s in cursor.fetchall()]
        print(f"Schemas in DB: {schemas}")
        
        for schema in schemas:
            if schema.startswith('pg_') or schema == 'information_schema':
                continue
            cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema}'")
            tables = [t[0] for t in cursor.fetchall()]
            print(f"  Schema {schema}: {tables[:10]} ... (total {len(tables)})")

if __name__ == "__main__":
    check_schemas()

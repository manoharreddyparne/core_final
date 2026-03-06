import django
import os
from django.db import connection

def list_all_tables():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
    django.setup()
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog');")
        tables = cursor.fetchall()
        print("ALL TABLES ACROSS ALL SCHEMAS:")
        for schema, table in sorted(tables):
            print(f"  {schema}.{table}")

if __name__ == "__main__":
    list_all_tables()

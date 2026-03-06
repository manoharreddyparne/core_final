import django
import os
from django.db import connection

def debug_db():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
    django.setup()
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT schemaname, tablename FROM pg_catalog.pg_tables WHERE tablename LIKE '%placement%';")
        tables = cursor.fetchall()
        print("TABLES FOUND:")
        for t in tables:
            print(f"  {t[0]}.{t[1]}")
            
        # Check actual columns in each
        for schema, table in tables:
            cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{table}';")
            cols = [r[0] for r in cursor.fetchall()]
            print(f"    Columns in {schema}.{table}: {cols}")

if __name__ == "__main__":
    debug_db()

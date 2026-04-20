
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def check_tables():
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name LIKE 'auip_%'
        """)
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables in public schema: {tables}")

if __name__ == "__main__":
    check_tables()

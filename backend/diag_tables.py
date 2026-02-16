import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()
from django.db import connection

schema_name = 'inst_mallareddy_university'
print(f"Checking tables in schema: {schema_name}")
with connection.cursor() as cursor:
    cursor.execute(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{schema_name}'")
    tables = [t[0] for t in cursor.fetchall()]

if not tables:
    print("NO TABLES FOUND in this schema.")
else:
    print(f"Found {len(tables)} tables:")
    for t in sorted(tables):
        print(f" - {t}")

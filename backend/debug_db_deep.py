import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def check_columns(schema):
    print(f"Checking columns for schema: {schema}")
    with connection.cursor() as cursor:
        cursor.execute(f"SET search_path TO {schema}")
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'placement_placementdrive'")
        cols = [c[0] for c in cursor.fetchall()]
        print(f"Columns in {schema}.placement_placementdrive:")
        for c in sorted(cols):
            print(f" - {c}")
        
        # Check migration table
        cursor.execute("SELECT name FROM django_migrations WHERE app = 'placement'")
        migs = [m[0] for m in cursor.fetchall()]
        print(f"Applied migrations for 'placement' in {schema}:")
        for m in sorted(migs):
            print(f" - {m}")

from apps.auip_tenant.models import Client
for c in Client.objects.all():
    check_columns(c.schema_name)
check_columns('public')

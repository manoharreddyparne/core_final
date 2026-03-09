import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model
from django_tenants.postgresql_backend.base import get_tenant_database_alias

def get_columns(schema):
    with schema_context(schema):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'placement_placementdrive'
            """)
            return [row[0] for row in cursor.fetchall()]

try:
    tenants = get_tenant_model().objects.all()
    schemas = ['public'] + [t.schema_name for t in tenants]

    for s in schemas:
        try:
            cols = get_columns(s)
            r = "reminders: YES" if 'auto_reminders_enabled' in cols else "reminders: NO"
            i = " inclusions: YES" if 'included_rolls' in cols else " inclusions: NO"
            print(f"Schema: {s:25} | Columns: {len(cols):3} | {r} | {i}")
        except Exception as e:
            print(f"Schema: {s:25} | Error: {e}")
except Exception as e:
    print(f"Setup Error: {e}")

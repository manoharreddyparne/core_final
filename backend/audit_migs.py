import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model

def get_migs(schema):
    with schema_context(schema):
        with connection.cursor() as cursor:
            cursor.execute("SELECT app, name FROM django_migrations WHERE app = 'placement'")
            return [row[1] for row in cursor.fetchall()]

tenants = get_tenant_model().objects.all()
schemas = ['public'] + [t.schema_name for t in tenants]

for s in schemas:
    try:
        migs = get_migs(s)
        print(f"Schema: {s:25} | Applied: {migs}")
    except Exception as e:
        print(f"Schema: {s:25} | Error: {e}")

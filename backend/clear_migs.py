import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def clear_migration(schema):
    print(f"Clearing migration state for {schema}...")
    with connection.cursor() as cursor:
        try:
            cursor.execute(f"SET search_path TO {schema}")
            cursor.execute("DELETE FROM django_migrations WHERE app = 'placement' AND name LIKE '0007%'")
            print(f" - DONE")
        except Exception as e:
            print(f" - FAILED: {str(e)}")

from apps.auip_tenant.models import Client
for c in Client.objects.all():
    clear_migration(c.schema_name)
clear_migration('public')

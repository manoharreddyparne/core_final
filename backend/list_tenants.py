
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def list_tenants():
    from apps.auip_tenant.models import Client
    clients = Client.objects.all().order_by('id')
    print(f"{'ID':<5} | {'Schema':<30} | {'Name':<40} | {'Created At'}")
    print("-" * 100)
    for c in clients:
        print(f"{c.id:<5} | {c.schema_name:<30} | {c.name:<40} | {c.created_on if hasattr(c, 'created_on') else 'N/A'}")

if __name__ == "__main__":
    list_tenants()

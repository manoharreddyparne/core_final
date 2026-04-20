
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def cleanup_more_tenants():
    from apps.auip_tenant.models import Client, Domain
    from apps.identity.models.institution import Institution
    
    # Explicitly targeting 'temp' and 'demo' as they are likely test leftovers
    targets = ['inst_temp', 'inst_demo_only']
    
    fake_clients = Client.objects.filter(schema_name__in=targets)
    
    print(f"Found {fake_clients.count()} more fake tenants to remove.")
    
    for client in fake_clients:
        schema_name = client.schema_name
        name = client.name
        print(f"Removing tenant: {name} (Schema: {schema_name})...")
        Domain.objects.filter(tenant=client).delete()
        Institution.objects.filter(schema_name=schema_name).delete()
        client.delete()
        with connection.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
            print(f"Dropped schema {schema_name}")

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_more_tenants()

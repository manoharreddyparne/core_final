
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def cleanup_tenants():
    from apps.auip_tenant.models import Client, Domain
    from apps.identity.models.institution import Institution
    
    # Identify fake tenants (mostly "test university" or random numbers)
    fake_clients = Client.objects.filter(
        schema_name__icontains='test'
    ) | Client.objects.filter(
        schema_name__icontains='dummy'
    ) | Client.objects.filter(
        name__icontains='Test University'
    )
    
    print(f"Found {fake_clients.count()} fake tenants to remove.")
    
    for client in fake_clients:
        schema_name = client.schema_name
        name = client.name
        
        print(f"Removing tenant: {name} (Schema: {schema_name})...")
        
        # 1. Remove domains
        Domain.objects.filter(tenant=client).delete()
        
        # 2. Remove associated Institution record if it exists
        Institution.objects.filter(schema_name=schema_name).delete()
        
        # 3. Remove the client record (this will drop the schema if auto_drop_schema is True)
        # But we'll manually drop the schema too just to be safe and clean.
        client.delete()
        
        with connection.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
            print(f"Dropped schema {schema_name}")

    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_tenants()

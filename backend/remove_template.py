
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def remove_template_tenant():
    from apps.auip_tenant.models import Client, Domain
    from apps.identity.models.institution import Institution
    
    # Check for anything named template
    clients = Client.objects.filter(schema_name__icontains='template')
    print(f"Found {clients.count()} template-related clients in DB.")
    
    for client in clients:
        schema_name = client.schema_name
        print(f"Removing client: {client.name} (Schema: {schema_name})...")
        Domain.objects.filter(tenant=client).delete()
        Institution.objects.filter(schema_name=schema_name).delete()
        client.delete()
        with connection.cursor() as cursor:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
            print(f"Dropped schema {schema_name}")

    # Manual check for the schema if no client record was found
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'template_tenant'")
        exists = cursor.fetchone()
        if exists:
            print("Schema 'template_tenant' exists without a Client record. Dropping manually...")
            cursor.execute('DROP SCHEMA IF EXISTS "template_tenant" CASCADE;')
            print("Dropped 'template_tenant' manually.")

if __name__ == "__main__":
    remove_template_tenant()

import django
import os
from django.db import connection
from django.apps import apps

def check_columns():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
    django.setup()
    
    from apps.auip_tenant.models import Client
    from django_tenants.utils import schema_context
    
    drives_model = apps.get_model('placement', 'PlacementDrive')
    
    for client in Client.objects.all():
        with schema_context(client.schema_name):
            with connection.cursor() as cursor:
                cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'placement_placementdrive' AND table_schema = '{client.schema_name}';")
                columns = [row[0] for row in cursor.fetchall()]
                has_exp = 'experience_years' in columns
                print(f"Schema: {client.schema_name:20} | Has experience_years: {has_exp}")

if __name__ == "__main__":
    check_columns()

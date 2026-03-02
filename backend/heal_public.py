
import os
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.auip_tenant.models import Client, Domain

print("--- HEALING BASE INFRASTRUCTURE ---")

# 1. Ensure 'public' client exists
# Note: For django-tenants, the 'public' schema should NOT have a separate PostgreSQL schema created manually, 
# it just uses the existing 'public' schema. But the Client model MUST have a record for it in the public schema's table.
try:
    public_client, created = Client.objects.get_or_create(
        schema_name='public',
        defaults={'name': 'AUIP Public Hub'}
    )
    if created:
        print("Created Public Client record.")
    else:
        print("Public Client record already exists.")

    # 2. Ensure domain exists to route requests to the public client
    # localhost, 127.0.0.1, and any other local dev aliases
    domains = ['localhost', '127.0.0.1']
    for d in domains:
        domain_obj, d_created = Domain.objects.get_or_create(
            domain=d,
            tenant=public_client,
            defaults={'is_primary': (d == 'localhost')}
        )
        if d_created:
            print(f"Created Domain record for {d}.")
        else:
            print(f"Domain record for {d} already exists.")

    print("--- BASE INFRASTRUCTURE HEALED ---")

except Exception as e:
    print(f"ERROR during healing: {e}")

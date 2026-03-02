
import os
import django
from django.db import connection

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.auip_tenant.models import Client, Domain
from apps.identity.models.institution import Institution, InstitutionAdmin

print("--- STARTING DATABASE WIPE ---")

# 1. Delete Domains and Clients
Domain.objects.all().delete()
Client.objects.all().delete()
print("Tenant Domains and Clients deleted.")

# 2. Delete institutions and admins
InstitutionAdmin.objects.all().delete()
Institution.objects.all().delete()
print("Institutions and Institutional Admin profiles deleted.")

# 3. Physically Drop Schemas
cursor = connection.cursor()
cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'inst_%'")
schemas = [s[0] for s in cursor.fetchall()]

for s in schemas:
    try:
        cursor.execute(f'DROP SCHEMA IF EXISTS "{s}" CASCADE')
        print(f"Dropped schema: {s}")
    except Exception as e:
        print(f"Failed to drop schema {s}: {e}")

# Also drop public-level data from apps that might be affected
# (Though they should mostly be tied to the institutions deleted above)

print("--- DATABASE WIPE COMPLETE ---")

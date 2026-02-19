
import os
import django
import sys
from django.conf import settings

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_tenant.models import Client, Domain
from django_tenants.utils import schema_context
from django.contrib.auth.hashers import make_password

def seed_institution():
    print(">> Seeding Test Institution...")
    
    # 1. Create Tenant (Client)
    schema_name = "inst_test_xx"
    name = "Test Institute of Technology"
    slug = "test-tech"
    domain_url = "test-tech.localhost" # for local testing
    
    if Client.objects.filter(schema_name=schema_name).exists():
        print("!! Tenant already exists. Skipping creation.")
        client = Client.objects.get(schema_name=schema_name)
    else:
        client = Client.objects.create(schema_name=schema_name, name=name)
        Domain.objects.create(domain=domain_url, tenant=client, is_primary=True)
        print(f">> Tenant created: {schema_name}")

    # 2. Create Public Institution Record (Metadata)
    inst, created = Institution.objects.get_or_create(
        slug=slug,
        defaults={
            "name": name,
            "domain": "test-tech.edu",
            "contact_email": "admin@test-tech.edu",
            "schema_name": schema_name,
            "status": "APPROVED",
            "is_active": True
        }
    )
    if created:
        print(f">> Institution Metadata created: {slug}")
    
    # 3. Create Isolated Admin Account in Tenant Schema
    # NO global User record is created. Login is fully tenant-isolated.
    with schema_context(schema_name):
        email = "v-thulasi.ram@gmail.com"
        password = "Password@123"
        
        from apps.auip_institution.models import AdminPreSeededRegistry, AdminAuthorizedAccount
        
        registry_entry, _ = AdminPreSeededRegistry.objects.get_or_create(
            identifier=email,
            defaults={
                "is_activated": True
            }
        )

        account, created = AdminAuthorizedAccount.objects.get_or_create(
            email=email,
            defaults={
                "registry_ref": registry_entry,
                "password_hash": make_password(password),
                "is_active": True
            }
        )
        if created:
            print(f">> Isolated Admin Created: {email} / {password}")
        else:
            # Update password if exists
            account.password_hash = make_password(password)
            account.save()
            print(f">> Isolated Admin Updated: {email}")

if __name__ == "__main__":
    try:
        seed_institution()
        print(">> Seeding Complete!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"!! Error: {e}")

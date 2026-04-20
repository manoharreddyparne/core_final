import os
import django
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.production")
django.setup()

from apps.auip_tenant.models import Client, Domain

def init_prod():
    print("🚀 Initializing Production Environment...")
    
    try:
        # 1. Create Public Tenant if it doesn't exist
        # Schema name MUST be 'public' for django-tenants root
        tenant, created = Client.objects.get_or_create(
            schema_name='public',
            defaults={'name': 'AUIP Public Hub'}
        )
        if created:
            print("✅ Public Tenant schema record created.")
        else:
            print("ℹ️ Public Tenant already exists in database.")
        
        # 2. link Render domain
        # The environment variable RENDER_EXTERNAL_HOSTNAME is provided by Render
        render_domain = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
        
        if render_domain:
            domain, created = Domain.objects.get_or_create(
                domain=render_domain,
                tenant=tenant,
                defaults={'is_primary': True}
            )
            if created:
                print(f"✅ Domain '{render_domain}' linked to Public Tenant.")
            else:
                print(f"ℹ️ Domain '{render_domain}' already linked.")
        else:
            print("⚠️ RENDER_EXTERNAL_HOSTNAME not found. Skipping domain linking.")
            
    except Exception as e:
        print(f"❌ Error during initialization: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    init_prod()

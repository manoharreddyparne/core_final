import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.auip_tenant.models import Client, Domain
from apps.identity.models import User

def nuke_all_institutions():
    print("🚀 Starting Institution Nuke Process...")
    
    # 1. Get all institutions
    institutions = Institution.objects.all()
    print(f"Found {institutions.count()} institution records.")
    
    for inst in institutions:
        print(f"--- Nuking: {inst.name} ({inst.schema_name}) ---")
        
        # Find the Tenant Client
        client = Client.objects.filter(schema_name=inst.schema_name).first()
        if client:
            print(f"🗑️ Deleting Tenant Schema: {client.schema_name}")
            # This handles physical schema deletion if using django-tenants
            client.delete()
        
        # Find the Admin Users for this institution
        admin_profiles = InstitutionAdmin.objects.filter(institution=inst)
        for profile in admin_profiles:
            user = profile.user
            print(f"🗑️ Deleting Admin User: {user.email}")
            user.delete()
        
        # Delete the profiles
        admin_profiles.delete()
        
        # Delete the institution record
        inst.delete()
        print(f"✅ Record for {inst.name} cleared.")

    print("\n✨ Cleaning up orphan institutional administrators...")
    User.objects.filter(role=User.Roles.INSTITUTION_ADMIN).delete()
    
    print("\n🏁 Nuke Complete. System is clean for fresh approval testing.")

if __name__ == "__main__":
    nuke_all_institutions()

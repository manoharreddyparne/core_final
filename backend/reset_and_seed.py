
import os
import django
import sys
from django.conf import settings

# Setup Django environment
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from apps.auip_tenant.models import Client, Domain

User = get_user_model()

def reset_db():
    print(">> Destroying all tenants (and their schemas)...")
    # Deleting clients should cascade delete schemas in django-tenants
    Client.objects.all().delete()
    print(">> Tenants destroyed.")

    print(">> Deleting all users in public schema...")
    User.objects.all().delete()
    print(">> Users deleted.")

    print(">> Creating Super Admin...")
    email = "parnemanoharreddy19@gmail.com"
    password = "Pandu@1919"
    
    # Check if exists (shouldn't, but safety first)
    if not User.objects.filter(email=email).exists():
        admin = User.objects.create_superuser(
            username=email,
            email=email,
            password=password,
            role="SUPER_ADMIN"
        )
        print(f">> Super Admin created: {email}")
    else:
        print(f"!! Super Admin already exists: {email}")

if __name__ == "__main__":
    try:
        reset_db()
        print(">> Database Reset & Seeding Complete!")
    except Exception as e:
        print(f"!! Error: {e}")

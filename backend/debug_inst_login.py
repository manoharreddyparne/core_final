
import os
import django
import sys

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_institution.models import AuthorizedAccount
from django_tenants.utils import schema_context
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import check_password

def debug_login():
    print(">> Starting Debug...")
    
    try:
        inst = Institution.objects.get(slug="test-tech")
    except Institution.DoesNotExist:
        print("!! Test Institution not found.")
        return

    print(f">> Institution: {inst.name}")
    print(f">> Schema: {inst.schema_name}")

    with schema_context(inst.schema_name):
        try:
            account = AuthorizedAccount.objects.get(email="admin@test-tech.edu", role='ADMIN')
            print(f">> Account found: {account.email}")
        except AuthorizedAccount.DoesNotExist:
            print("!! Account NOT found in schema.")
            return

        if check_password("Admin@12345", account.password_hash):
            print(">> Password Verified: OK")
        else:
            print("!! Password Verification FAILED")
            return

        print(">> Attempting Token Generation...")
        try:
            refresh = RefreshToken()
            refresh["user_id"] = account.id
            refresh["schema"] = inst.schema_name
            refresh["role"] = "INSTITUTION_ADMIN"
            refresh["email"] = account.email
            
            access = str(refresh.access_token)
            print(">> Token Generation SUCCESS")
            print(f"Access: {access[:20]}...")
            print(f"Refresh: {str(refresh)[:20]}...")
        except Exception as e:
            print(f"!! Token Generation ERROR: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    debug_login()

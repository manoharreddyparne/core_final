import os
import django
import sys
from django.db.models import Q

# Setup Django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models import User
from django.contrib.auth import authenticate

def debug_login():
    email = "parnemanoharreddy19@gmail.com"
    password = "Pandu@1919"
    
    print(f"--- DIAGNOSING LOGIN FOR {email} ---")
    
    # 1. Fetch User Metadata
    try:
        user = User.objects.get(email=email)
        print(f"1. User Exists: YES (ID: {user.id})")
        print(f"   - Username: '{user.username}'")
        print(f"   - Role: '{user.role}'")
        print(f"   - Is Active: {user.is_active}")
        print(f"   - Is Superuser: {user.is_superuser}")
        print(f"   - Is Staff: {user.is_staff}")
    except User.DoesNotExist:
        print("1. User Exists: NO (Stop)")
        return

    # 2. Check Password Directly
    if user.check_password(password):
        print("2. Password Check (Direct): PASS")
    else:
        print("2. Password Check (Direct): FAIL")

    # 3. Check Authentication Backend (Simulate View Logic)
    # Most login views use 'username' or 'email' as the lookup field.
    # We test both.
    
    print("\n3. Authenticate via Django Backend:")
    
    # Attempt 1: Using Email as username
    user_auth_email = authenticate(username=email, password=password)
    print(f"   - authenticate(username='{email}'): {'SUCCESS' if user_auth_email else 'FAILED'}")
    
    # Attempt 2: Using actual username
    user_auth_user = authenticate(username=user.username, password=password)
    print(f"   - authenticate(username='{user.username}'): {'SUCCESS' if user_auth_user else 'FAILED'}")

    # 4. Check Custom View Logic (Mocking AdminTokenObtainPairView)
    # Inspecting what the view actually does
    print("\n4. View Logic Simulation (AdminTokenObtainPairView):")
    login_field = email
    
    # Logic extracted from typical view
    user_qs = User.objects.filter(
        Q(username__iexact=login_field) | Q(email__iexact=login_field)
    ).first()
    
    if not user_qs:
        print("   - View Lookup: FAILED (User not found by email/username)")
    else:
        print(f"   - View Lookup: MATCHED user {user_qs.email}")
        
        # Check Role Restriction (Common in Admin Views)
        # Assuming the view checks for specific roles
        allowed_roles = ['SUPER_ADMIN', 'INST_ADMIN', 'ADMIN', 'TEACHER'] # inferred standard
        if user_qs.role in allowed_roles:
             print(f"   - Role Check: PASS ({user_qs.role} is in allowed list)")
        else:
             print(f"   - Role Check: FAIL ({user_qs.role} NOT in {allowed_roles})")

if __name__ == "__main__":
    debug_login()

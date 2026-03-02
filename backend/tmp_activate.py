
import os
import django
import datetime
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models.institution import Institution
from apps.identity.utils.activation import verify_activation_token
from django_tenants.utils import schema_context
from django.contrib.auth.hashers import make_password
from apps.identity.models.core_models import User

token = '63.ADMIN.admin@auip.edu.7113rzc9uqePUXwgcAn6I4A5XqD8U3EZ:1vwzCL:gn1HCGLaHwLecbeBjmqVFmK1_S7PTiM5KDdQtWO_abs'
password = 'Password123'

result = verify_activation_token(token)
if result:
    inst_id, identifier, role = result
    print(f"Token verified for {identifier}")
    
    institution = Institution.objects.get(id=inst_id)
    
    # 1. Update Global User
    user = User.objects.filter(email=identifier).first()
    if user:
        user.set_password(password)
        user.is_active = True
        user.save()
        print(f"Global User {identifier} updated.")
    else:
        print(f"Global User {identifier} NOT FOUND.")

    # 2. Update Tenant Context
    with schema_context(institution.schema_name):
        from apps.auip_institution.models import AdminPreSeededRegistry, AdminAuthorizedAccount
        try:
            reg = AdminPreSeededRegistry.objects.get(identifier__iexact=identifier)
            acc, created = AdminAuthorizedAccount.objects.get_or_create(
                registry_ref=reg,
                defaults={
                    'email': identifier.lower(),
                    'password_hash': make_password(password),
                    'is_active': True
                }
            )
            if not created:
                acc.password_hash = make_password(password)
                acc.is_active = True
                acc.save()
            
            reg.is_activated = True
            reg.activated_at = timezone.now()
            reg.save()
            print(f"Tenant Account for {identifier} activated in schema {institution.schema_name}.")
        except Exception as e:
            print(f"Error in tenant activation: {e}")

    print("--- PHASE 2 COMPLETE ---")
else:
    print("Token Verification Failed!")

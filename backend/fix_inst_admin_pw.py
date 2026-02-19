import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.base')
django.setup()

from apps.identity.models import User
from apps.auip_institution.models import AuthorizedAccount
from django_tenants.utils import schema_context
from django.contrib.auth.hashers import make_password

email = 'parnemanoharreddy19@gmail.com'
password = 'Pandu@19136'
schema = 'inst_test_xx'

print(f"Fixing account for {email} in schema {schema}")

# 1. Update Global User
u = User.objects.filter(email=email).first()
if u:
    u.set_password(password)
    u.save()
    print("Global User password updated.")
else:
    print("Global User not found.")

# 2. Update AuthorizedAccount in Tenant
try:
    with schema_context(schema):
        a = AuthorizedAccount.objects.filter(email=email).first()
        if a:
            a.password_hash = make_password(password)
            a.save()
            print("AuthorizedAccount password updated in tenant.")
        else:
            print("AuthorizedAccount not found in tenant.")
except Exception as e:
    print(f"Error updating tenant: {e}")

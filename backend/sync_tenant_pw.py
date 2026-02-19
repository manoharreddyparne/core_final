import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.base')
django.setup()

from apps.auip_institution.models import AuthorizedAccount
from django_tenants.utils import schema_context
from django.contrib.auth.hashers import make_password

email = 'parnemanoharreddy19@gmail.com'
password = 'Pandu@19136'
schema = 'inst_mallareddy_university'

print(f"Synchronizing password for {email} in {schema}...")

try:
    with schema_context(schema):
        a = AuthorizedAccount.objects.filter(email=email).first()
        if a:
            a.password_hash = make_password(password)
            a.save()
            print("Successfully updated password in tenant.")
        else:
            print("Account not found in this tenant.")
except Exception as e:
    print(f"Error: {e}")

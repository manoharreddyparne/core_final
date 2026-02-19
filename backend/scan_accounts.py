import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.base')
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_institution.models import AuthorizedAccount
from django_tenants.utils import schema_context

email = 'parnemanoharreddy19@gmail.com'

print(f"Scanning all institutions for {email}...")

for inst in Institution.objects.all():
    if not inst.schema_name:
        continue
    try:
        with schema_context(inst.schema_name):
            a = AuthorizedAccount.objects.filter(email=email).first()
            if a:
                print(f"Found in {inst.schema_name} (ID: {inst.id}, Name: {inst.name}) - Role: {a.role}")
    except Exception as e:
        # print(f"Error in {inst.schema_name}: {e}")
        pass

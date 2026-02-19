import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.base')
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_institution.models import PreSeededRegistry
from django_tenants.utils import schema_context

email = 'parnemanoharreddy19@gmail.com'
schema = 'inst_test_xx'

print(f"Checking registry in {schema} for {email}...")

try:
    with schema_context(schema):
        r = PreSeededRegistry.objects.filter(identifier=email).first()
        if r:
            print(f"Registry found: Role={r.role}, Status={r.is_activated}")
        else:
            print("Registry not found.")
except Exception as e:
    print(f"Error: {e}")

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from django.db import connection
from apps.identity.utils.multitenancy import schema_context
from apps.auip_institution.models import PreSeededRegistry

schema_name = 'inst_mallareddy_university'
print(f"Testing PreSeededRegistry access in schema: {schema_name}")

try:
    with schema_context(schema_name):
        count = PreSeededRegistry.objects.count()
        print(f"Success! Found {count} records in PreSeededRegistry.")
        
        # Try a get_or_create
        obj, created = PreSeededRegistry.objects.get_or_create(
            identifier="test_repro",
            defaults={"email": "test@repro.com", "role": "STUDENT"}
        )
        print(f"Get or create successful. Created: {created}")
except Exception as e:
    print(f"FAILURE: {e}")
    import traceback
    traceback.print_exc()

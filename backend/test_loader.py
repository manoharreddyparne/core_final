import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.utils.multitenancy import get_migration_loader, get_tenant_app_labels

def test_loader_switching():
    loader = get_migration_loader()
    tenant_labels = get_tenant_app_labels()
    
    schemas = ['public', 'inst_mallareddy', 'inst_mrgi']
    
    for schema in schemas:
        print(f"\n--- Testing Schema: {schema} ---")
        with schema_context(schema):
            loader.build_graph()
            applied = [m for m in loader.applied_migrations.keys() if m[0] in tenant_labels]
            print(f"  Applied migrations count: {len(applied)}")
            if len(applied) > 0:
                print(f"  Example: {applied[0]}")

if __name__ == "__main__":
    test_loader_switching()


from apps.auip_tenant.models import Client, Domain
from django.db import connection

SCHEMA_NAME = 'inst_test'
TENANT_NAME = 'Test Institution'

try:
    if not Client.objects.filter(schema_name=SCHEMA_NAME).exists():
        print(f"Creating tenant '{TENANT_NAME}' with schema '{SCHEMA_NAME}'...")
        tenant = Client(schema_name=SCHEMA_NAME, name=TENANT_NAME)
        tenant.save() # This triggers schema creation and migration
        
        domain = Domain()
        domain.domain = 'test.localhost' # Subdomain
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        print("Tenant created.")
    else:
        print("Tenant already exists.")
        
    # Verify tables
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = %s", 
            [SCHEMA_NAME]
        )
        tables = [row[0] for row in cursor.fetchall()]
        
    expected_tables = [
        'auip_institution_academicregistry',
        'auip_institution_preseededregistry',
        'auip_institution_authorizedaccount',
        'auip_institution_facultyprofile'
    ]
    
    missing = [t for t in expected_tables if t not in tables]
    
    if not missing:
        print(f"SUCCESS: All expected tables found in schema '{SCHEMA_NAME}'")
        print(f"Tables: {tables}")
    else:
        print(f"FAILURE: Missing tables in schema '{SCHEMA_NAME}': {missing}")
        print(f"Found: {tables}")

except Exception as e:
    print(f"ERROR: {e}")

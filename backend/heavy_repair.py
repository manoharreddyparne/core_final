import os
import django
from django.db import connection
from django_tenants.utils import schema_context, get_tenant_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def repair_schema(schema_name):
    print(f"\n--- REPAIRING SCHEMA: {schema_name} ---")
    with schema_context(schema_name):
        cursor = connection.cursor()
        
        # 1. Gather all tables in this schema
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s", [schema_name])
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        # Rename nexora_institution_ to auip_institution_
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE 'nexora_institution_%%'", [schema_name])
        for old_name in [row[0] for row in cursor.fetchall()]:
            new_name = old_name.replace('nexora_institution_', 'auip_institution_')
            if new_name not in existing_tables:
                print(f"  Rerouting table: {old_name} -> {new_name}")
                cursor.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')
            else:
                print(f"  Conflict: {new_name} ALREADY exists, skipping rename of {old_name}")

        # Update migrations table
        cursor.execute("UPDATE django_migrations SET app='auip_institution' WHERE app='nexora_institution'")
        if cursor.rowcount > 0:
            print(f"  Migrated {cursor.rowcount} entries to auip_institution app label.")

        # Rename nexora_tenant_ to auip_tenant_
        cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE 'nexora_tenant_%%'", [schema_name])
        for old_name in [row[0] for row in cursor.fetchall()]:
            new_name = old_name.replace('nexora_tenant_', 'auip_tenant_')
            if new_name not in existing_tables:
                print(f"  Rerouting table: {old_name} -> {new_name}")
                cursor.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')
            else:
                print(f"  Conflict: {new_name} ALREADY exists, skipping rename of {old_name}")
            
        cursor.execute("UPDATE django_migrations SET app='auip_tenant' WHERE app='nexora_tenant'")
        if cursor.rowcount > 0:
            print(f"  Migrated {cursor.rowcount} entries to auip_tenant app label.")

def main():
    repair_schema('public')
    TenantModel = get_tenant_model()
    for tenant in TenantModel.objects.all():
        try:
            repair_schema(tenant.schema_name)
        except Exception as e:
            print(f"  FAILED to repair {tenant.schema_name}: {e}")

if __name__ == "__main__":
    main()

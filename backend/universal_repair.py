import os
import django
from django.db import connection, transaction
from django_tenants.utils import schema_context, get_tenant_model, get_public_schema_name

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_tenant.models import Client, Domain

def repair_all_schemas():
    print("\n[STEP 1] Re-registering all Approved Institutions as Tenants")
    approved = Institution.objects.filter(status=Institution.RegistrationStatus.APPROVED).exclude(schema_name__isnull=True).exclude(schema_name='')
    
    for inst in approved:
        client, created = Client.objects.get_or_create(
            schema_name=inst.schema_name,
            defaults={'name': inst.name}
        )
        if created:
            print(f"  Created missing Client: {inst.name} ({inst.schema_name})")
        
        # Ensure Domain exists for client - use slug.localhost or slug.auip.com
        if not Domain.objects.filter(tenant=client).exists():
            domain_name = f"{inst.slug}.localhost" # Default fallback
            Domain.objects.create(
                domain=domain_name,
                tenant=client,
                is_primary=True
            )
            print(f"  Created missing Domain: {domain_name} for {inst.name}")

    print("\n[STEP 2] Multi-Schema Repair (Tables + Labels)")
    # We include all institutions + public
    all_schemas = [get_public_schema_name()] + [inst.schema_name for inst in approved]
    
    for schema_name in all_schemas:
        print(f"\n--- REPAIRING: {schema_name} ---")
        try:
            with schema_context(schema_name):
                cursor = connection.cursor()
                
                # Check current tables
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s", [schema_name])
                existing_tables = [row[0] for row in cursor.fetchall()]

                # Fix nexora_institution_ tables
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE 'nexora_institution_%%'", [schema_name])
                for old_name in [row[0] for row in cursor.fetchall()]:
                    new_name = old_name.replace('nexora_institution_', 'auip_institution_')
                    if new_name not in existing_tables:
                        print(f"  Renaming {old_name} -> {new_name}")
                        cursor.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')

                # Fix nexora_tenant_ tables
                cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE 'nexora_tenant_%%'", [schema_name])
                for old_name in [row[0] for row in cursor.fetchall()]:
                    new_name = old_name.replace('nexora_tenant_', 'auip_tenant_')
                    if new_name not in existing_tables:
                        print(f"  Renaming {old_name} -> {new_name}")
                        cursor.execute(f'ALTER TABLE "{old_name}" RENAME TO "{new_name}"')

                # Update labels in django_migrations
                cursor.execute("UPDATE django_migrations SET app='auip_institution' WHERE app='nexora_institution'")
                cursor.execute("UPDATE django_migrations SET app='auip_tenant' WHERE app='nexora_tenant'")
                
                # SPECIAL FIX: Missing Dependency (Dependency Failure: governance.0002 -> auip_institution.0009)
                # If governance.0002 is applied but auip_institution.0009 is not, we fake it.
                cursor.execute("SELECT name FROM django_migrations WHERE app='governance' AND name='0002_governancepolicy_alter_newsletter_unique_together_and_more'")
                has_governance_2 = cursor.fetchone()
                
                cursor.execute("SELECT name FROM django_migrations WHERE app='auip_institution' AND name='0009_alter_facultyacademicregistry_department_and_more'")
                has_auip_9 = cursor.fetchone()
                
                if has_governance_2 and not has_auip_9:
                    print("  Inconsistency detected: Repairing missing auip_institution migration history (Faking 0001-0011)...")
                    # Fake 0001-0011
                    migrations_to_fake = [
                        '0001_initial', '0002_remove_authorizedaccount_user_and_more', 
                        '0003_adminpreseededregistry_facultypreseededregistry_and_more',
                        '0004_studentacademicregistry_admission_year_and_more',
                        '0005_facultyacademicregistry_and_more',
                        '0006_facultypreseededregistry_activation_token_and_more',
                        '0007_add_name_fields_to_authorized_accounts',
                        '0008_increase_token_length',
                        '0009_alter_facultyacademicregistry_department_and_more',
                        '0010_facultyacademicregistry_department_ref_and_more',
                        '0011_facultyacademicregistry_official_email_and_more'
                    ]
                    from django.utils import timezone
                    now = timezone.now()
                    for mig in migrations_to_fake:
                        cursor.execute("SELECT 1 FROM django_migrations WHERE app='auip_institution' AND name=%s", [mig])
                        if not cursor.fetchone():
                            cursor.execute("INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)", ['auip_institution', mig, now])
                            print(f"    - Faked {mig}")
        except Exception as e:
            print(f"  FAILED REPAIR on {schema_name}: {e}")

if __name__ == "__main__":
    repair_all_schemas()

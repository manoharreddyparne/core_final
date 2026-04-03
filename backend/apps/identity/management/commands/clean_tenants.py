"""
Management Command: clean_tenants
=================================
Safely removes ALL institutional tenant schemas from the database
and cleans up the related public-schema records.

Usage:
    python manage.py clean_tenants             # Preview what will be deleted
    python manage.py clean_tenants --confirm   # Actually delete everything

What it removes:
  - Each tenant PostgreSQL schema (DROP SCHEMA ... CASCADE)
  - apps.auip_tenant.Client + Domain records
  - apps.identity.Institution + InstitutionAdmin records
  - apps.identity.LoginSession records linked to tenants
  - apps.identity.User records with role INST_ADMIN (from public schema)

The public schema itself is NEVER touched.
"""

import sys
from django.core.management.base import BaseCommand
from django.db import connection


PROTECTED_SCHEMAS = {
    # PostgreSQL built-ins
    'public', 'information_schema', 'pg_catalog', 'pg_toast',
    # Supabase system schemas (NEVER touch these)
    'auth', 'extensions', 'graphql', 'graphql_public',
    'realtime', 'storage', 'vault', 'supabase_functions',
    'supabase_migrations', '_realtime', 'net', 'pgbouncer',
    'pgsodium', 'pgsodium_masks', 'cron',
}

# Only schemas with these prefixes will be considered tenant schemas.
TENANT_SCHEMA_PREFIXES = ('inst_', 'tenant_', 'school_', 'univ_', 'college_')


class Command(BaseCommand):
    help = 'Remove all institutional tenant schemas and their related public records for a clean slate.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Actually perform the deletion. Without this flag, runs in dry-run (preview) mode.',
        )
        parser.add_argument(
            '--schema',
            type=str,
            default=None,
            help='Only delete a specific schema by name (e.g. --schema inst_mit). Omit to delete ALL.',
        )

    def handle(self, *args, **options):
        # Force UTF-8 output for Windows terminals
        if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

        confirm = options['confirm']
        target_schema = options.get('schema')

        self.stdout.write('\n' + '='*60)
        self.stdout.write('  Nexora -- Tenant Schema Cleanup Tool')
        self.stdout.write('='*60)

        if not confirm:
            self.stdout.write(
                '\n[DRY RUN] No changes will be made.\n'
                'Run with --confirm to actually delete.\n'
            )

        # Step 1: Find all tenant schemas
        self.stdout.write('\nScanning for tenant schemas...\n')

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name NOT IN %s
                  AND schema_name NOT LIKE 'pg_%%'
                ORDER BY schema_name;
            """, [tuple(PROTECTED_SCHEMAS)])
            raw_schemas = [row[0] for row in cursor.fetchall()]

        # Only include schemas that look like tenant schemas.
        all_schemas = [
            s for s in raw_schemas
            if s.startswith(TENANT_SCHEMA_PREFIXES)
        ]

        # Also include schemas from the Institution table (in case they use different prefix)
        from apps.identity.models.institution import Institution
        db_schema_names = list(Institution.objects.exclude(schema_name__isnull=True).exclude(schema_name='').values_list('schema_name', flat=True))
        for s in raw_schemas:
            if s in db_schema_names and s not in all_schemas:
                all_schemas.append(s)

        if not all_schemas:
            self.stdout.write('No tenant schemas found. Database is already clean.')
            return

        # Filter to specific schema if requested
        if target_schema:
            schemas_to_delete = [s for s in all_schemas if s == target_schema]
            if not schemas_to_delete:
                self.stdout.write(f'ERROR: Schema "{target_schema}" not found.')
                self.stdout.write(f'Available schemas: {", ".join(all_schemas)}')
                return
        else:
            schemas_to_delete = all_schemas

        self.stdout.write(f'Found {len(schemas_to_delete)} tenant schema(s) to remove:\n')
        for schema in schemas_to_delete:
            self.stdout.write(f'  [SCHEMA] {schema}')

        # Step 2: Gather public-schema records to delete
        from apps.identity.models.institution import Institution, InstitutionAdmin
        from apps.identity.models.core_models import User
        from apps.identity.models import LoginSession

        institutions = Institution.objects.filter(schema_name__in=schemas_to_delete)
        institution_ids = list(institutions.values_list('id', flat=True))
        institution_names = list(institutions.values_list('name', flat=True))

        # Global User records linked to these institutions (INST_ADMIN role)
        inst_admin_users = User.objects.filter(
            institution_admin_profile__institution_id__in=institution_ids
        )
        inst_admin_emails = list(inst_admin_users.values_list('email', flat=True))

        # Tenant LoginSessions
        tenant_sessions = LoginSession.objects.filter(tenant_schema__in=schemas_to_delete)

        self.stdout.write('\nPublic schema records that will be cleaned:\n')
        self.stdout.write(f'  Institutions       : {len(institution_ids)}  ({", ".join(institution_names) or "none"})')
        self.stdout.write(f'  InstitutionAdmins  : {InstitutionAdmin.objects.filter(institution_id__in=institution_ids).count()}')
        self.stdout.write(f'  Global Admin Users : {len(inst_admin_emails)}  ({", ".join(inst_admin_emails) or "none"})')
        self.stdout.write(f'  Tenant LoginSessions: {tenant_sessions.count()}')

        # Check for Client/Domain records
        try:
            from apps.auip_tenant.models import Client, Domain
            tenant_clients = Client.objects.filter(schema_name__in=schemas_to_delete)
            tenant_client_count = tenant_clients.count()
        except Exception:
            tenant_client_count = 0
            tenant_clients = None

        self.stdout.write(f'  Tenant Clients     : {tenant_client_count}')

        # Step 3: Perform deletion (if confirmed)
        if not confirm:
            self.stdout.write('\n' + '='*60)
            self.stdout.write('[DRY RUN] Run with --confirm to perform the above deletions.')
            self.stdout.write('  e.g.: python manage.py clean_tenants --confirm')
            self.stdout.write('='*60 + '\n')
            return

        self.stdout.write('\nStarting deletion...\n')

        # Delete tenant LoginSessions first (FK constraints)
        deleted_sessions = tenant_sessions.count()
        tenant_sessions.delete()
        self.stdout.write(f'  [OK] Deleted {deleted_sessions} tenant login sessions')

        # Delete InstitutionAdmin profiles
        ia_count = InstitutionAdmin.objects.filter(institution_id__in=institution_ids).count()
        InstitutionAdmin.objects.filter(institution_id__in=institution_ids).delete()
        self.stdout.write(f'  [OK] Deleted {ia_count} InstitutionAdmin profiles')

        # Delete global User records for institution admins
        deleted_users = inst_admin_users.count()
        inst_admin_users.delete()
        self.stdout.write(f'  [OK] Deleted {deleted_users} global admin User records')

        # Delete Institution records
        institutions.delete()
        self.stdout.write(f'  [OK] Deleted {len(institution_ids)} Institution records')

        # Delete Tenant Client/Domain records
        if tenant_clients:
            tenant_clients.delete()
            self.stdout.write(f'  [OK] Deleted {tenant_client_count} Tenant Client records')

        # Drop the actual PostgreSQL schemas
        self.stdout.write('\nDropping PostgreSQL schemas...\n')
        with connection.cursor() as cursor:
            for schema in schemas_to_delete:
                if schema in PROTECTED_SCHEMAS:
                    self.stdout.write(f'  [SKIP] Protected schema (not touched): {schema}')
                    continue
                try:
                    cursor.execute(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE;')
                    self.stdout.write(f'  [OK] Dropped schema: {schema}')
                except Exception as e:
                    self.stdout.write(f'  [ERROR] Failed to drop schema {schema}: {e}')

        self.stdout.write('\n' + '='*60)
        self.stdout.write(
            f'DONE! {len(schemas_to_delete)} tenant schema(s) removed. '
            f'Database is clean and ready for fresh testing.'
        )
        self.stdout.write('='*60 + '\n')


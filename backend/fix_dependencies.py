import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def fix_all_dependencies():
    from apps.identity.models.institution import Institution
    approved = Institution.objects.filter(is_setup_complete=True, status='APPROVED')
    
    # We use numeric prefixes to find the exact migrations on disk
    apps_faking_rules = {
        'auip_institution': [f"{i:04d}" for i in range(1, 12)], # 0001 to 0011
        'academic': ['0001', '0002', '0003'],
        'governance': ['0001', '0002', '0003', '0004']
    }
    
    from django.db.migrations.loader import MigrationLoader
    loader = MigrationLoader(connection)
    
    for inst in approved:
        schema = inst.schema_name
        print(f"--- Processing {schema} ---")
        with schema_context(schema):
            with connection.cursor() as cursor:
                for app, prefixes in apps_faking_rules.items():
                    # Check if app has tables in this schema
                    cursor.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_name LIKE %s LIMIT 1", [schema, f"{app}%"])
                    if not cursor.fetchone():
                        print(f"  [SKIPPED] App {app} has no tables in {schema}.")
                        continue
                        
                    for prefix in prefixes:
                        # Find full name on disk
                        full_name = None
                        for disk_app, disk_name in loader.disk_migrations.keys():
                            if disk_app == app and disk_name.startswith(prefix):
                                full_name = disk_name
                                break
                        
                        if not full_name:
                            print(f"  [WARNING] No disk migration for {app} starting with {prefix}")
                            continue
                            
                        # Check if already applied
                        cursor.execute("SELECT id FROM django_migrations WHERE app=%s AND name=%s", [app, full_name])
                        if not cursor.fetchone():
                            print(f"  [FAKING] {app}.{full_name} ...")
                            import datetime
                            cursor.execute("INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)", [app, full_name, datetime.datetime.now()])
                        else:
                            # print(f"  [EXISTS] {app}.{full_name}")
                            pass

if __name__ == "__main__":
    fix_all_dependencies()

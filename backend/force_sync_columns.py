import django
import os
from django.db import connection

def force_sync_columns():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
    django.setup()
    
    from apps.auip_tenant.models import Client
    from django_tenants.utils import schema_context
    
    sql_commands = [
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS experience_years VARCHAR(100) DEFAULT '';",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS min_ug_percentage DECIMAL(5,2) DEFAULT 0.00;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS chat_session_id UUID;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS contact_details JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS custom_criteria JSONB DEFAULT '{}'::jsonb;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS hiring_process JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS qualifications JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE placement_placementdrive ADD COLUMN IF NOT EXISTS salary_range VARCHAR(255) DEFAULT '';"
    ]
    
    # Also public schema
    schemas = ['public'] + [c.schema_name for c in Client.objects.all()]
    
    for schema in set(schemas):
        print(f"Syncing columns for schema: {schema}")
        with schema_context(schema):
            with connection.cursor() as cursor:
                for sql in sql_commands:
                    try:
                        cursor.execute(sql)
                    except Exception as e:
                        print(f"  [ERROR] on {sql[:30]}... : {e}")

if __name__ == "__main__":
    force_sync_columns()

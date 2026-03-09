import os
import django
from django.db import connection
from django_tenants.utils import schema_context

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.base')
django.setup()

def check_table(schema_name, table_name):
    with schema_context(schema_name):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s 
                    AND table_name = %s
                );
            """, [schema_name, table_name])
            return cursor.fetchone()[0]

schema = 'inst_mallareddy'
table = 'exams_exam'
exists = check_table(schema, table)
print(f"Table {schema}.{table} exists: {exists}")

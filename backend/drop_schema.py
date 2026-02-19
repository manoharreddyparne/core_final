import os
import sys
import django

# Add the project root to the python path
sys.path.append(os.getcwd())

from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def drop_schema(schema_name):
    with connection.cursor() as cursor:
        try:
            cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE;')
            print(f'Schema {schema_name} dropped successfully.')
        except Exception as e:
            print(f'Error dropping {schema_name}: {e}')

if __name__ == "__main__":
    drop_schema("inst_mallareddy")
    drop_schema("mallareddy")

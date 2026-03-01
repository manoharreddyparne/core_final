import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

def drop_all_inst_schemas():
    print("🧨 STARTING PHYSICAL SCHEMA PURGE...")
    
    with connection.cursor() as cursor:
        # Fetch all schemas starting with inst_
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'inst_%';")
        schemas = [row[0] for row in cursor.fetchall()]
        
        if not schemas:
            print("✨ No institutional schemas found. System is already clean.")
            return

        print(f"Found {len(schemas)} schemas to drop: {', '.join(schemas)}")
        
        for schema in schemas:
            print(f"🔥 Dropping schema: {schema}...")
            try:
                # CASCADE is needed to drop all tables, sequences, etc. inside the schema
                cursor.execute(f"DROP SCHEMA IF EXISTS {schema} CASCADE;")
                print(f"✅ Schema {schema} purged.")
            except Exception as e:
                print(f"❌ Failed to drop {schema}: {e}")

    print("\n🏁 PHYSICAL PURGE COMPLETE.")

if __name__ == "__main__":
    drop_all_inst_schemas()

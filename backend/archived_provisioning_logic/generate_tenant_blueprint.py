
import os
import sys
import subprocess
from pathlib import Path
from django.conf import settings
import django

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def generate_blueprint(source_schema="inst_test_university_1773347739"):
    db_conf = settings.DATABASES['default']
    
    # We use pg_dump to extract the structural blueprint
    # -s: Schema only (no data)
    # -n: Target schema
    # --no-owner: Don't export ownership commands (prevents errors on different DB users)
    # --no-privileges: Don't export GRANT/REVOKE (prevents security leaks/errors)
    
    backend_root = Path(settings.BASE_DIR).parent
    blueprint_path = backend_root / "apps" / "identity" / "blueprints" / "tenant_schema.sql"
    blueprint_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"--- [BLUEPRINT] Extracting structure from '{source_schema}' ---")
    
    # Set PG password for the session
    os.environ['PGPASSWORD'] = db_conf['PASSWORD']
    
    cmd = [
        'pg_dump',
        '-h', db_conf['HOST'],
        '-p', str(db_conf.get('PORT', 5432)),
        '-U', db_conf['USER'],
        '-d', db_conf['NAME'],
        '-n', source_schema,
        '-s', # Schema only
        '--no-owner',
        '--no-privileges'
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        sql = result.stdout
        
        # 🚨 CRITICAL: We must strip the hardcoded schema name so it's a generic template
        # PostgreSQL exports it as 'SET search_path = inst_...;' or 'CREATE TABLE inst_...table'
        # We replace the specific schema name with a placeholder __SCHEMA_NAME__
        
        sql = sql.replace(source_schema, "__SCHEMA_NAME__")
        
        # Remove lines that set the search path or create the schema to be safe
        lines = sql.splitlines()
        filtered_lines = [
            l for l in lines 
            if not l.strip().startswith("SET search_path") 
            and not l.strip().startswith("CREATE SCHEMA")
            and not l.strip().startswith("-- Name: __SCHEMA_NAME__; Type: SCHEMA")
        ]
        sql = "\n".join(filtered_lines)

        with open(blueprint_path, "w", encoding='utf-8') as f:
            f.write(sql)
            
        print(f"Success! Blueprint generated at: {blueprint_path}")
        print(f"File size: {os.path.getsize(blueprint_path) / 1024:.2f} KB")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to generate blueprint: {e.stderr}")
        sys.exit(1)
    finally:
        if 'PGPASSWORD' in os.environ:
            del os.environ['PGPASSWORD']

if __name__ == "__main__":
    generate_blueprint()

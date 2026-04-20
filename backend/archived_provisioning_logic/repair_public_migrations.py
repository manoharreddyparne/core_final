
import os
import django
from django.db import connection
from django.utils import timezone
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def repair_migrations():
    apps_dir = Path('apps')
    with connection.cursor() as cursor:
        for app_path in apps_dir.iterdir():
            if not app_path.is_dir():
                continue
            
            mig_dir = app_path / 'migrations'
            if not mig_dir.exists():
                continue
                
            app_name = app_path.name
            print(f"Checking {app_name}...")
            
            for mig_file in mig_dir.glob('*.py'):
                if mig_file.name == '__init__.py':
                    continue
                
                mig_name = mig_file.stem
                # Check if exists
                cursor.execute("SELECT 1 FROM django_migrations WHERE app=%s AND name=%s", [app_name, mig_name])
                if not cursor.fetchone():
                    print(f"  Faking {mig_name}...")
                    cursor.execute(
                        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                        [app_name, mig_name, timezone.now()]
                    )
    print("Repair complete.")

if __name__ == "__main__":
    repair_migrations()

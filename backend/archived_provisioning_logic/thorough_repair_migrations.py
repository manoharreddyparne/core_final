
import os
import django
from django.db import connection
from django.utils import timezone
from pathlib import Path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def thorough_repair():
    apps_dir = Path('apps')
    with connection.cursor() as cursor:
        print("Truncating django_migrations for managed apps...")
        # Get list of apps to clear
        apps_to_clear = [d.name for d in apps_dir.iterdir() if d.is_dir() and (d / 'migrations').exists()]
        
        # Also include third party apps that might be messy
        apps_to_clear += ['account', 'socialaccount', 'sites', 'django_celery_beat', 'django_celery_results', 'token_blacklist']
        
        for app in apps_to_clear:
            cursor.execute("DELETE FROM django_migrations WHERE app=%s", [app])
            
        print("Faking all migrations from disk...")
        for app_path in apps_dir.iterdir():
            if not app_path.is_dir(): continue
            mig_dir = app_path / 'migrations'
            if not mig_dir.exists(): continue
            
            app_name = app_path.name
            migs = sorted([f.stem for f in mig_dir.glob('*.py') if f.name != '__init__.py'])
            for mig_name in migs:
                print(f"  {app_name}:{mig_name}")
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app_name, mig_name, timezone.now()]
                )

        # Do the same for important third party ones if they have migrations
        # Actually, migrate --fake will handle them if I just do it for my apps.
        
    print("Thorough repair complete.")

if __name__ == "__main__":
    thorough_repair()

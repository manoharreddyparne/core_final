
import os
import django
from django.db import connection
from django.db.migrations.loader import MigrationLoader

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def fake_everything():
    loader = MigrationLoader(connection, ignore_no_migrations=True)
    with connection.cursor() as cursor:
        print("Faking all migrations known to Django...")
        for key in loader.disk_migrations.keys():
            app, name = key
            # Check if applied
            cursor.execute("SELECT 1 FROM django_migrations WHERE app=%s AND name=%s", [app, name])
            if not cursor.fetchone():
                print(f"  Faking {app}:{name}")
                from django.utils import timezone
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, name, timezone.now()]
                )
    print("Faking complete.")

if __name__ == "__main__":
    fake_everything()

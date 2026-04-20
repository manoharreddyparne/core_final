
import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def cleanup():
    from django.conf import settings
    shared_apps = [app.split('.')[-1] for app in settings.SHARED_APPS]
    # Add django built-ins and third party apps that are known to be in public
    allowed_apps = set(shared_apps + [
        'admin', 'auth', 'contenttypes', 'sessions', 'messages', 'staticfiles', 'sites',
        'account', 'socialaccount', 'authtoken', 'token_blacklist', 'django_celery_beat', 'django_celery_results'
    ])
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT DISTINCT app FROM django_migrations")
        current_apps = [row[0] for row in cursor.fetchall()]
        
        for app in current_apps:
            if app not in allowed_apps:
                print(f"Removing {app} from public django_migrations...")
                cursor.execute("DELETE FROM django_migrations WHERE app=%s", [app])
    
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup()

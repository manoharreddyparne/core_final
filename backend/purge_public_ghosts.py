import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def purge_public_ghosts():
    # Only remove migrations for apps that are strictly TENANT APPS
    # and should NOT have been applied to the public schema.
    from django.conf import settings
    shared_labels = [app.split('.')[-1] for app in settings.SHARED_APPS]
    tenant_labels = [app.split('.')[-1] for app in settings.TENANT_APPS]
    
    ghosts = [label for label in tenant_labels if label not in shared_labels]
    
    print(f"Purging ghost migrations from PUBLIC schema: {ghosts}")
    
    with connection.cursor() as cursor:
        # We ensure we are in public schema
        cursor.execute("SET search_path TO public")
        
        format_strings = ','.join(['%s'] * len(ghosts))
        cursor.execute(f"DELETE FROM django_migrations WHERE app IN ({format_strings})", ghosts)
        print(f"Successfully deleted ghost entries from django_migrations (public).")

if __name__ == "__main__":
    purge_public_ghosts()

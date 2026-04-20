import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

def cleanup_public_migrations():
    tenant_apps = [
        'auip_institution', 'academic', 'exams', 'governance', 
        'placement', 'projects', 'resumes', 'social', 'chathub', 'core_brain'
    ]
    print(f"--- Cleaning up public migration table ---")
    try:
        cursor = connection.cursor()
        cursor.execute(f"DELETE FROM django_migrations WHERE app IN ({','.join(['%s' for _ in tenant_apps])})", tenant_apps)
        print(f"Deleted {cursor.rowcount} rogue entries for tenant-specific apps from public schema.")
    except Exception as e:
        print(f"Error cleaning up: {e}")

if __name__ == "__main__":
    cleanup_public_migrations()

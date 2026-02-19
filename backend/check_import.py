import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

print("Attempting to import security_service...")
try:
    from apps.identity.services.security_service import is_ip_blocked
    print("SUCCESS: Import successful.")
except Exception as e:
    print(f"FAILURE: Import failed: {e}")
    import traceback
    traceback.print_exc()

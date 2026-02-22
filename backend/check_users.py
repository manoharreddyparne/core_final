import os
import django
import sys
from django.conf import settings

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from apps.identity.models import User
from django_tenants.utils import schema_context

def check_users():
    print(">> Checking Public Users...")
    with schema_context('public'):
        users = User.objects.all()
        for u in users:
            print(f"User: {u.email} | Role: {u.role} | ID: {u.id}")

if __name__ == "__main__":
    check_users()

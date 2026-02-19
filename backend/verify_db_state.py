
import os
import django
import sys
from django.db import connection

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django.contrib.auth import get_user_model
from apps.auip_tenant.models import Client

User = get_user_model()

def inspect_db():
    print(">> Inspecting Database State...")
    
    # 1. Check Schemas
    with connection.cursor() as cursor:
        cursor.execute("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') AND schema_name NOT LIKE 'pg_%%'")
        schemas = [row[0] for row in cursor.fetchall()]
        print(f">> Existing Schemas: {schemas}")

    # 2. Check Clients
    client_count = Client.objects.count()
    print(f">> Total Tenants (Clients): {client_count}")
    for c in Client.objects.all():
        print(f"   - {c.schema_name} ({c.name})")

    # 3. Check Public Users
    user_count = User.objects.count()
    print(f">> Total Public Users (Super Admins): {user_count}")
    for u in User.objects.all():
        print(f"   - {u.email} ({u.role})")

if __name__ == "__main__":
    inspect_db()

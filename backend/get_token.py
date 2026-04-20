import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models.activation import ActivationToken, TenantActivationToken
from apps.auip_tenant.models import Client

email = sys.argv[1] if len(sys.argv) > 1 else None
if not email:
    print("Email argument required")
    sys.exit(1)

t = ActivationToken.objects.filter(email=email).order_by('-created_at').first()

tenant_t = TenantActivationToken.objects.filter(email=email).order_by('-created_at').first()

from django.conf import settings as s
frontend = getattr(s, 'FRONTEND_URL', 'http://localhost:3000')

if tenant_t and (not t or tenant_t.created_at > t.created_at):
    print(f"{frontend}/auth/activate?token={tenant_t.token}")
elif t:
    print(f"{frontend}/auth/activate?token={t.token}")
else:
    print("NONE")

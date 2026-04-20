import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()
from apps.identity.models.institution import Institution
all_insts = Institution.objects.all()
for i in all_insts:
    print(f"Name: {i.name}, Slug: '{i.slug}', Status: {i.status}")

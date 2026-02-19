
import os
import django
import sys

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from apps.identity.models.institution import Institution

def list_institutions():
    print(">> Listing Institutions...")
    for inst in Institution.objects.all():
        print(f"ID: {inst.id} | Name: {inst.name} | Schema: {inst.schema_name} | Slug: {inst.slug}")

if __name__ == "__main__":
    list_institutions()

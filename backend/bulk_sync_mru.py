import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_institution.models import StudentAcademicRegistry
from django_tenants.utils import schema_context

def bulk_sync():
    inst = Institution.objects.filter(name__icontains='Mallareddy').first()
    with schema_context(inst.schema_name):
        students = StudentAcademicRegistry.objects.all()
        print(f"Syncing {students.count()} students in {inst.name}...")
        for s in students:
            s.sync_to_preseeded()
        print("Bulk sync complete.")

if __name__ == "__main__":
    bulk_sync()

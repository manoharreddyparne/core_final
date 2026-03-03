import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings")
django.setup()

from apps.identity.models.institution import Institution
from apps.auip_institution.models import StudentPreSeededRegistry, StudentAcademicRegistry
from django_tenants.utils import schema_context

def check_mru():
    inst = Institution.objects.filter(name__icontains='Mallareddy').first()
    if not inst:
        print("Institution not found")
        return
    
    with schema_context(inst.schema_name):
        reg_count = StudentPreSeededRegistry.objects.count()
        acad_count = StudentAcademicRegistry.objects.count()
        print(f"Institution: {inst.name} ({inst.schema_name})")
        print(f"Pre-Seeded Registry Count: {reg_count}")
        print(f"Academic Registry Count: {acad_count}")
        
        # Check specific student
        target = "2211CS010426"
        s = StudentAcademicRegistry.objects.filter(roll_number__iexact=target).first()
        if s:
            print(f"Student {target} found in Academic Registry. Syncing...")
            s.sync_to_preseeded()
            print("Sync complete.")
        else:
            print(f"Student {target} NOT found in Academic Registry.")

if __name__ == "__main__":
    check_mru()

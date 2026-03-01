import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from django_tenants.utils import schema_context

from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry

schemas = ['inst_mallareddy_university', 'inst_andhra_university']

for schema in schemas:
    print(f"\n--- Schema: {schema} ---")
    try:
        with schema_context(schema):
            academic_count = StudentAcademicRegistry.objects.count()
            preseeded_count = StudentPreSeededRegistry.objects.count()
            activated_count = StudentPreSeededRegistry.objects.filter(is_activated=True).count()
            
            print(f"Academic Registry Count: {academic_count}")
            print(f"Pre-Seeded Registry Count: {preseeded_count}")
            print(f"Activated Count: {activated_count}")
            
            if academic_count > 0:
                last = StudentAcademicRegistry.objects.latest('created_at')
                print(f"Latest Student: {last.roll_number} ({last.created_at})")
    except Exception as e:
        print(f"Error checking {schema}: {e}")

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()
from django_tenants.utils import schema_context
from apps.auip_institution.models import StudentAcademicRegistry
with schema_context('inst_mallareddy'):
    for s in StudentAcademicRegistry.objects.order_by('?')[:5]:
        val = s.history_data.get('10th_percent')
        print(f"[{s.roll_number}] 10th_percent: {val} (type {type(val)})")

import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()
from django_tenants.utils import schema_context
from apps.auip_institution.models import StudentAcademicRegistry
with schema_context('inst_mallareddy'):
    s = StudentAcademicRegistry.objects.filter(roll_number='2211cs010217').first()
    if not s:
        s = StudentAcademicRegistry.objects.first()
    print('Branch:', getattr(s, 'branch', 'None'))
    print('History Data:', s.history_data)

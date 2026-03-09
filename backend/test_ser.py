import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()
from django_tenants.utils import schema_context
from apps.placement.serializers import PlacementDriveSerializer
from django.http import QueryDict

with schema_context('inst_mallareddy'):
    q = QueryDict(mutable=True)
    q.update({
        'company_name': 'Test',
        'deadline': '2026-03-15T18:49',
        'min_10th_percent': '65',
        'min_12th_percent': '0',
        'min_cgpa': '',
        'min_ug_percentage': '',
        'eligible_branches': '["CSE", "IT"]',
        'allowed_active_backlogs': '',
        'is_inclusion_mode': 'false',
        'auto_reminders_enabled': 'true',
        'manual_students': '[]',
        'included_rolls': '[]',
        'excluded_rolls': '[]'
    })
    
    serializer = PlacementDriveSerializer(data=q)
    if not serializer.is_valid():
        print("Errors:", serializer.errors)
    else:
        print("Valid!", serializer.validated_data.get('min_10th_percent'))

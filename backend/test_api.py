import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from django_tenants.utils import tenant_context
from apps.auip_institution.models import Institution

# We need to simulate the tenant
tenant = Institution.objects.get(schema_name='inst_mallareddy')

with tenant_context(tenant):
    from apps.auip_institution.models import AdminAuthorizedAccount
    from rest_framework.test import APIClient
    client = APIClient()
    
    admin = AdminAuthorizedAccount.objects.first()
    if admin:
        admin.role = 'INST_ADMIN'
        client.force_authenticate(user=admin)
        
        for tenth_val in ['0', '65', '65.0']:
            payload = {
                'company_name': 'Test Company',
                'deadline': '2026-03-15T18:49',
                'min_10th_percent': tenth_val,
                'min_12th_percent': '0',
                'min_cgpa': '0',
                'min_ug_percentage': '0',
                'allowed_active_backlogs': '0',
                'eligible_branches': '[]',
                'is_inclusion_mode': 'false',
                'auto_reminders_enabled': 'true',
                'manual_students': '[]',
                'included_rolls': '[]',
                'excluded_rolls': '[]',
                'page': '1',
                'page_size': '50',
                'q': ''
            }
            
            response = client.post('/api/placement/drives/check_eligibility/', payload, format='multipart')
            if response.status_code == 200:
                data = response.json()
                print(f"[{tenth_val}] count:", data['data']['total_count'])
                # print(data['data']['_debug'].get('drive_filters'))
            else:
                print(f"[{tenth_val}] error:", response.content)
    else:
        print("No admin found in tenant!")

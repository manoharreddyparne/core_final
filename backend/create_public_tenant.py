
from apps.auip_tenant.models import Client, Domain

try:
    if not Client.objects.filter(schema_name='public').exists():
        tenant = Client(schema_name='public', name='Public Tenant')
        tenant.save()
        
        domain = Domain()
        domain.domain = 'localhost' # Adjust for production later
        domain.tenant = tenant
        domain.is_primary = True
        domain.save()
        print("SUCCESS: Created public tenant and domain 'localhost'")
    else:
        print("INFO: Public tenant already exists")

except Exception as e:
    print(f"ERROR: {e}")

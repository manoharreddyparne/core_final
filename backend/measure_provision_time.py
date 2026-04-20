
import os
import sys
import django
import time

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models.institution import Institution
from apps.identity.tasks import provision_institution_task
from django.utils.text import slugify

def test_provision():
    name = f"Test University {int(time.time())}"
    slug = slugify(name)
    email = f"admin@{slug}.edu"
    
    print(f"Creating institution: {name}")
    inst = Institution.objects.create(
        name=name,
        slug=slug,
        domain=f"{slug}.test.edu",
        contact_email=email,
        status="PENDING",
        schema_name=f"inst_{slug.replace('-', '_')}"
    )
    
    print(f"Starting provisioning for ID={inst.id}...")
    start_time = time.time()
    
    # Run the task synchronously for testing/timing
    provision_institution_task(inst.id)
    
    end_time = time.time()
    duration = end_time - start_time
    print(f"\nProvisioning completed in {duration:.2f} seconds.")
    
    inst.refresh_from_db()
    print(f"Final Status: {inst.status}")
    print(f"Schema: {inst.schema_name}")

if __name__ == "__main__":
    test_provision()

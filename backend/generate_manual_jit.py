import os
import django
import sys
import time
from django.conf import settings

# Setup Django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.utils.jit_admin import generate_jit_admin_ticket

def generate_link():
    # Use the email provided by the user in the prompt
    email = "parnemanoharreddy19@gmail.com"
    
    print(f"Generating JIT ticket for: {email}")
    ticket = generate_jit_admin_ticket(email=email)
    
    # Construct URL
    # Assuming standard dev port 3000 for frontend
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    access_url = f"{frontend_url}/auth/secure-gateway?ticket={ticket}"
    
    print("\n" + "="*60)
    print("MANUAL JIT LINK GENERATED")
    print("="*60)
    print(access_url)
    print("="*60 + "\n")

if __name__ == "__main__":
    generate_link()

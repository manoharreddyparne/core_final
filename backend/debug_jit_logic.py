import os
import django
import sys
from django.conf import settings
from django.core.mail import send_mail

# Setup Django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

def debug_jit():
    print("--- DEBUGGING JIT LOGIC ---")
    
    # 1. Check Settings
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"SUPER_ADMIN_EMAIL: {settings.SUPER_ADMIN_EMAIL}")
    
    # 2. Simulate User Input
    identifier = "parnemanoharreddy19@gmail.com"
    email = identifier.strip().lower()
    target = settings.SUPER_ADMIN_EMAIL.lower()
    
    print(f"Input Email: '{email}'")
    print(f"Target Email: '{target}'")
    
    if email == target:
        print("MATCH: YES. Proceeding to send email...")
        try:
            send_mail(
                'JIT Logic Test',
                'If you see this, the JIT logic is working and credentials are correct.',
                settings.DEFAULT_FROM_EMAIL,
                [target],
                fail_silently=False,
            )
            print("SUCCESS: Email sent via send_mail.")
        except Exception as e:
            print(f"FAILURE: send_mail raised exception: {e}")
    else:
        print("MATCH: NO. Email comparison failed!")
        print(f"'{email}' != '{target}'")
        print("Check .env setup for SUPER_ADMIN_EMAIL")

if __name__ == "__main__":
    debug_jit()

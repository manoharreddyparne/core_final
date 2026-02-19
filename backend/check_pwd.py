import os
import django
import sys

# Add project root to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models import User

def check():
    email = "parnemanoharreddy19@gmail.com"
    pwd = "Pandu@19136"
    
    try:
        user = User.objects.get(email=email)
        match = user.check_password(pwd)
        print(f"User: {email}")
        print(f"Password Match: {match}")
    except User.DoesNotExist:
        print(f"User {email} not found.")

if __name__ == "__main__":
    check()

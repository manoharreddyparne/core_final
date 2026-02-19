import os
import django
import sys

# Add project root to path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models import User

def reset():
    email = "parnemanoharreddy19@gmail.com"
    pwd = "Pandu@19136"
    
    try:
        user = User.objects.get(email=email)
        user.set_password(pwd)
        user.save()
        print(f"Success: Password for {email} has been reset to '{pwd}'")
    except User.DoesNotExist:
        print(f"Error: User {email} not found.")

if __name__ == "__main__":
    reset()

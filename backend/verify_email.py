import os
import django
import sys
from django.core.mail import send_mail
from django.conf import settings

# Setup Django
sys.path.append(os.getcwd() + '/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

def verify_email():
    print(f"Testing EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"Testing EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"Testing EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"Testing EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    
    try:
        send_mail(
            'AUIP SMTP Test',
            'This is a test email from the AUIP Backend Verification Script.',
            settings.DEFAULT_FROM_EMAIL,
            [settings.EMAIL_HOST_USER], # Send to self
            fail_silently=False,
        )
        print("SUCCESS: Email sent successfully.")
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    verify_email()

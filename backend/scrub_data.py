import os
import django

# Set up django
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.social.models import ChatSession, ChatMessage, JoinRequest, SocialPost, SocialLike, SocialComment, SupportTicket, Connection
from apps.placement.models import PlacementDrive, PlacementApplication, PlacementProcessStage
from apps.notifications.models import Notification, Announcement
from django_tenants.utils import schema_context, get_tenant_model

def purge_model(model, label):
    try:
        cnt = model.objects.count()
        if cnt > 0:
            model.objects.all().delete()
            print(f"   ✅ Cleared {cnt} from {label}")
    except Exception:
        pass # Not in this schema

def scrub_all():
    print("🚀 Starting Deep Data Scrub...")
    
    # 1. Models to target
    models = [
        ChatMessage, ChatSession, JoinRequest, 
        SocialPost, SocialLike, SocialComment, SupportTicket, Connection,
        Notification, Announcement,
        PlacementDrive, PlacementApplication, PlacementProcessStage
    ]

    # 2. Try Public Schema
    with schema_context('public'):
        print("🌍 Scrubbing Public Schema...")
        for m in models:
            purge_model(m, f"Public:{m.__name__}")

    # 3. Try All Tenants
    Tenant = get_tenant_model()
    for tenant in Tenant.objects.exclude(schema_name='public'):
        with schema_context(tenant.schema_name):
            print(f"📦 Scrubbing Tenant: {tenant.schema_name}")
            for m in models:
                purge_model(m, f"{tenant.schema_name}:{m.__name__}")

if __name__ == "__main__":
    scrub_all()
    print("✨ Cleanup Synchronized. You are ready for a fresh start.")

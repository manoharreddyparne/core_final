import os
import django
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models import User
from apps.intelligence.models import AIChatConversation

def test_global_chat_persistence():
    # Find a Super Admin
    super_admin = User.objects.filter(role=User.Roles.SUPER_ADMIN).first()
    if not super_admin:
        print("❌ No Super Admin found for testing.")
        return

    print(f"Testing for Super Admin: {super_admin.email}")
    
    # Try to create a conversation in the public schema
    try:
        conv = AIChatConversation.objects.create(
            user_id=super_admin.id,
            user_role='SUPER_ADMIN',
            title='Global Governance Inquiry'
        )
        print(f"✅ Created conversation: {conv.id} in public schema.")
        
        # Cleanup
        conv.delete()
        print("✅ Cleanup successful.")
    except Exception as e:
        print(f"❌ Failed to persist conversation: {e}")

if __name__ == "__main__":
    test_global_chat_persistence()

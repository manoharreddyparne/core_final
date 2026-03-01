import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.identity.models.institution import Institution, InstitutionAdmin
from apps.auip_tenant.models import Client, Domain
from apps.identity.models import User
from apps.intelligence.models import AIChatConversation, LLMInteraction, ATSAnalysis
from django.contrib.auth.hashers import make_password

def super_nuke_everything():
    print("🔥 BOOTING SUPER NUKE SYSTEM Protocol...")
    
    # 1. CLEAN TENANTS & DOMAINS (Except Public)
    clients = Client.objects.exclude(schema_name='public')
    print(f"Orphaned/Leftover Clients found: {clients.count()}")
    for client in clients:
        print(f"🗑️ Nuking Client & Schema: {client.schema_name}")
        # Domain records should cascade if DomainMixin is correct, but let's be sure
        Domain.objects.filter(tenant=client).delete()
        client.delete()

    # Clean up any leftover Domains not pointing to valid tenants
    Domain.objects.exclude(tenant__schema_name='public').delete()

    # 2. CLEAN INSTITUTION RECORDS
    print("🗑️ Clearing Identity Institution tables...")
    InstitutionAdmin.objects.all().delete()
    Institution.objects.all().delete()

    # 3. CLEAN PUBLIC SCHEMA TRASH
    print("🗑️ Scrubbing Public AI Logs...")
    AIChatConversation.objects.all().delete()
    LLMInteraction.objects.all().delete()
    ATSAnalysis.objects.all().delete()

    # 4. RESTORE MASTER SUPER ADMIN
    target_email = 'parnemanoharreddy19@gmail.com'
    print(f"👤 Restoring Master Admin: {target_email}")
    
    user, created = User.objects.get_or_create(
        email=target_email,
        defaults={
            'username': target_email.split('@')[0],
            'role': User.Roles.SUPER_ADMIN,
            'is_staff': True,
            'is_superuser': True,
            'password': make_password('Pandu@191919')
        }
    )
    
    if not created:
        print("Admin already exists, resetting role/privileges...")
        user.role = User.Roles.SUPER_ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.password = make_password('Pandu@191919')
        user.save()
    else:
        print("Admin account recreated from zero.")

    # 5. REMOVE OTHER USERS (except system ones if any)
    print("🗑️ Clearing non-master users...")
    User.objects.exclude(email=target_email).exclude(email='debug_admin@example.com').delete()

    print("\n🏁 SYSTEM IS NOW PURE. Ready for fresh Institution Lifecycle Testing.")

if __name__ == "__main__":
    super_nuke_everything()

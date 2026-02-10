import os
import django
from django.conf import settings

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()

from apps.identity.models import User, Institution, InstitutionAdmin, CoreStudent

def verify_multitenancy():
    print("--- Multi-Tenancy Verification ---")
    
    # 1. Create Super Admin
    super_admin, _ = User.objects.get_or_create(
        email="super@auip.com",
        defaults={
            "username": "superadmin",
            "role": "SUPER_ADMIN",
            "is_staff": True,
            "is_superuser": True
        }
    )
    if _:
        super_admin.set_password("Admin@123")
        super_admin.save()
    print(f"Super Admin created: {super_admin.email}")

    # 2. Create Institution MIT
    mit, _ = Institution.objects.get_or_create(
        slug="mit",
        defaults={
            "name": "MIT University",
            "domain": "mit.edu",
            "contact_email": "admin@mit.edu"
        }
    )
    print(f"Institution created: {mit.name}")

    # 3. Create MIT Admin
    mit_user, _ = User.objects.get_or_create(
        email="admin@mit.edu",
        defaults={
            "username": "mit_admin",
            "role": "INST_ADMIN"
        }
    )
    if _:
        mit_user.set_password("Admin@123")
        mit_user.save()
    
    mit_admin_profile, _ = InstitutionAdmin.objects.get_or_create(
        user=mit_user,
        defaults={"institution": mit}
    )
    print(f"MIT Admin created: {mit_user.email}")

    # 4. Create Institution Stanford
    stanford, _ = Institution.objects.get_or_create(
        slug="stanford",
        defaults={
            "name": "Stanford University",
            "domain": "stanford.edu",
            "contact_email": "admin@stanford.edu"
        }
    )
    print(f"Institution created: {stanford.name}")

    # 5. Create Stanford Admin
    stan_user, _ = User.objects.get_or_create(
        email="admin@stanford.edu",
        defaults={
            "username": "stan_admin",
            "role": "INST_ADMIN"
        }
    )
    if _:
        stan_user.set_password("Admin@123")
        stan_user.save()
    
    stan_admin_profile, _ = InstitutionAdmin.objects.get_or_create(
        user=stan_user,
        defaults={"institution": stanford}
    )
    print(f"Stanford Admin created: {stan_user.email}")

    # Cleanup old test data
    CoreStudent.objects.filter(stu_ref__in=["2026-MIT-001", "2026-STAN-001"]).delete()

    # 6. Seed Students
    s1 = CoreStudent.objects.create(
        stu_ref="2026-MIT-001",
        roll_number="MIT101",
        full_name="MIT Student One",
        department="CSE",
        batch_year=2026,
        current_semester=4,
        official_email="s1@mit.edu",
        institution=mit,
        tenth_percentage=90.0,
        twelfth_percentage=85.0,
        seeded_by="system@auip.com"
    )
    
    s2 = CoreStudent.objects.create(
        stu_ref="2026-STAN-001",
        roll_number="STAN101",
        full_name="Stanford Student One",
        department="CSE",
        batch_year=2026,
        current_semester=4,
        official_email="s1@stanford.edu",
        institution=stanford,
        tenth_percentage=95.0,
        twelfth_percentage=90.0,
        seeded_by="system@auip.com"
    )
    print("Students seeded for both institutions.")

    # 7. Verify Isolation (Simulation of ViewSet logic)
    def simulate_list_students(user):
        from apps.identity.utils.tenant_utils import get_user_institution
        inst = get_user_institution(user)
        if user.role == "SUPER_ADMIN":
            return CoreStudent.objects.all().count()
        return CoreStudent.objects.filter(institution=inst).count()

    print(f"Super Admin sees {simulate_list_students(super_admin)} students (Expected: {CoreStudent.objects.count()})")
    print(f"MIT Admin sees {simulate_list_students(mit_user)} students (Expected: 1)")
    print(f"Stanford Admin sees {simulate_list_students(stan_user)} students (Expected: 1)")

    assert simulate_list_students(mit_user) == 1
    assert simulate_list_students(stan_user) == 1
    print("\nSUCCESS: Multi-tenant isolation verified!")

if __name__ == "__main__":
    verify_multitenancy()

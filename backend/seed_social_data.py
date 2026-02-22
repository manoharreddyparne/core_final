import os
import django
import sys
from django.conf import settings

# Setup Django
sys.path.append('c:/Manohar/AUIP/AUIP-Platform/backend')
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

from django_tenants.utils import schema_context
from apps.auip_tenant.models import Client
from apps.auip_institution.models import (
    StudentAcademicRegistry, 
    FacultyAcademicRegistry, 
    AdminAuthorizedAccount,
    AdminPreSeededRegistry
)

def seed_social():
    print(">> Seeding Social Peer Data...")
    
    # We'll seed into the default test tenant
    schema_name = "inst_mallareddy_university"
    if not Client.objects.filter(schema_name=schema_name).exists():
        print(f"!! Schema {schema_name} not found. Seeding aborted.")
        return

    with schema_context(schema_name):
        # 1. Seed Students
        students = [
            ("20CS001", "Aarav Sharma", "B.Tech", "CSE", 2020),
            ("20CS002", "Ishani Gupta", "B.Tech", "CSE", 2020),
            ("20EC003", "Vihaan Malhotra", "B.Tech", "ECE", 2020),
            ("21ME004", "Ananya Singh", "B.Tech", "ME", 2021),
            ("21CS005", "Kabir Das", "B.Tech", "CSE", 2021),
        ]
        for roll, name, prog, branch, batch in students:
            StudentAcademicRegistry.objects.get_or_create(
                roll_number=roll,
                defaults={
                    "full_name": name,
                    "program": prog,
                    "branch": branch,
                    "batch_year": batch,
                    "official_email": f"{roll.lower()}@test-tech.edu"
                }
            )
        print(f">> Seeded {len(students)} Students.")

        # 2. Seed Faculty
        faculty = [
            ("FAC001", "Dr. Rajesh Kumar", "rajesh.k@test-tech.edu", "Professor", "Computer Science"),
            ("FAC002", "Sarah Jenkins", "sarah.j@test-tech.edu", "Associate Professor", "Electronics"),
            ("FAC003", "Amit Vikram", "amit.v@test-tech.edu", "Assistant Professor", "Mechanical"),
            ("FAC004", "Parne Manohar Reddy", "parnemanoharreddy21@gmail.com", "Senior Professor", "AI & Robotics"),
        ]
        for eid, name, email, desig, dept in faculty:
            FacultyAcademicRegistry.objects.update_or_create(
                employee_id=eid,
                defaults={
                    "full_name": name,
                    "email": email,
                    "designation": desig,
                    "department": dept
                }
            )
        print(f">> Seeded {len(faculty)} Faculty Members.")

        # 3. Seed Admin (Manually in Registry if needed, or check existing)
        # We already have v-thulasi.ram@gmail.com as InstAdmin in seed_test_institution.py
        # Let's ensure a Manohar-like admin exists for search testing
        AdminPreSeededRegistry.objects.get_or_create(
            identifier="thulasi.ram@auip.org",
            defaults={"is_activated": True}
        )
        AdminAuthorizedAccount.objects.get_or_create(
            email="thulasi.ram@auip.org",
            defaults={
                "registry_ref": AdminPreSeededRegistry.objects.get(identifier="thulasi.ram@auip.org"),
                "first_name": "Thulasi",
                "last_name": "Ram",
                "password_hash": "...",
                "is_active": True
            }
        )

if __name__ == "__main__":
    seed_social()

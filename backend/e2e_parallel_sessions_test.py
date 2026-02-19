"""
AUIP Parallel Session Verification
==================================
Run inside Docker: docker-compose exec -T backend python e2e_parallel_sessions_test.py
"""
import os, sys, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "auip_core.settings.development")
django.setup()

import requests
from apps.identity.models import User, LoginSession

BASE = "http://127.0.0.1:8000/api/users"
TEST_EMAIL = "parallel-test@auip.edu"
TEST_PASSWORD = "ParallelPassword123!"

# Setup user
User.objects.filter(email=TEST_EMAIL).delete()
user = User.objects.create_user(
    email=TEST_EMAIL,
    username=TEST_EMAIL,
    password=TEST_PASSWORD,
    role=User.Roles.ADMIN
)
print(f"Created test user: {TEST_EMAIL}")

def login(ua):
    s = requests.Session()
    s.headers.update({"Host": "localhost", "User-Agent": ua})
    r = s.post(f"{BASE}/admin/login/", json={
        "username": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    return s, r.json()

print("\n--- Device 1 Login ---")
s1, r1 = login("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Device1")
print(f"S1 Success: {r1.get('success')}")

print("\n--- Device 2 Login ---")
s2, r2 = login("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Device2")
print(f"S2 Success: {r2.get('success')}")

# Check all sessions for user
print("\n--- Session Audit ---")
all_sessions = LoginSession.objects.filter(user=user)
print(f"Total sessions found: {all_sessions.count()}")
for s in all_sessions:
    print(f"  ID: {s.id} | JTI: {s.jti[:8]}... | Refresh JTI: {s.refresh_jti[:8] if s.refresh_jti else 'None'}... | Active: {s.is_active}")

# Verify Session 1 is still valid
print("\n--- Verify Session 1 ---")
v1 = s1.get(f"{BASE}/me/")
print(f"S1 Verification Status: {v1.status_code}")

if v1.status_code == 200:
    print("\u2705 Parallel sessions are WORKING.")
else:
    print("\u274c Parallel sessions are BROKEN.")
    print(f"Response: {v1.text}")

# Cleanup
# User.objects.filter(email=TEST_EMAIL).delete()

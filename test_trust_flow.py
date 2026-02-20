import requests
import json

base_url = "http://localhost:8000/api/users"
session = requests.Session()

# Same credentials, different endpoints
login_data = {
    "institution_id": 42,
    "identifier": "parnemanoharreddy19@gmail.com", # Student uses 'identifier'
    "email": "parnemanoharreddy19@gmail.com",      # Faculty uses 'email'
    "password": "Pandu@1919",
    "turnstile_token": "XXXX.DUMMY.TOKEN.XXXX",
    "remember_device": True
}

# 1. Login as Faculty -> MFA -> Trust
print(f"--- 1: Faculty Login ---")
r1 = session.post(f"{base_url}/auth/v2/faculty/login/", json=login_data)
if r1.json().get('data', {}).get('require_otp'):
    print("MFA required as expected.")
    mfa_data = {**login_data, "otp": "123456"}
    session.post(f"{base_url}/auth/v2/faculty/mfa/", json=mfa_data)
    print("Faculty MFA done (Remember Device = True)")

# 2. Check Faculty Trust
print(f"\n--- 2: Checking Faculty Trust Bypass ---")
r2 = session.post(f"{base_url}/auth/v2/faculty/login/", json=login_data)
if not r2.json().get('data', {}).get('require_otp'):
    print("SUCCESS: Faculty Trust Bypass worked.")
else:
    print("FAIL: Faculty Trust Bypass failed.")

# 3. Login as Student (Same email, same session/device)
print(f"\n--- 3: Login as Student ---")
# Reset session to simulate fresh login but keep cookies if needed? 
# Actually, different endpoints should have different trust anyway.
r3 = session.post(f"{base_url}/auth/v2/student/login/", json=login_data)
print(f"Student Login Status: {r3.status_code}, Role: {r3.json().get('data', {}).get('role')}")

# 4. Check RememberedDevice table roles
# We expect two records for the same email but different roles

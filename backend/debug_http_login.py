
import requests
import json

url = "http://localhost:8000/api/institution/auth/inst-admin/login/"
data = {
    "institution_id": 32, # Correct ID from list_institutions logic
    "email": "admin@test-tech.edu",
    "password": "Admin@12345",
    "turnstile_token": "dummy" 
}

try:
    print(f">> POST {url}")
    res = requests.post(url, json=data)
    print(f">> Status: {res.status_code}")
    print(">> Response:")
    print(res.text)
except Exception as e:
    print(f"!! Request Failed: {e}")

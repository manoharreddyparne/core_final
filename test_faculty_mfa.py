import requests
import json

base_url = "http://localhost:8000/api/users"

mfa_data = {
    "institution_id": 42,
    "email": "parnemanoharreddy19@gmail.com",
    "otp": "123456",
    "remember_device": True
}

print(f"Testing Faculty MFA Verify for {mfa_data['email']}...")
try:
    response = requests.post(f"{base_url}/auth/v2/faculty/mfa/", json=mfa_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 200:
        access_token = response.json().get('data', {}).get('access')
        print(f"\nAccess Token obtained: {access_token[:50]}...")
except Exception as e:
    print(f"Error: {e}")

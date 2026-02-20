import requests
import json

base_url = "http://localhost:8000/api/users"

login_data = {
    "institution_id": 42,
    "email": "parnemanoharreddy19@gmail.com",
    "password": "Pandu@1919",
    "turnstile_token": "XXXX.DUMMY.TOKEN.XXXX"
}

print(f"Testing Faculty Login for {login_data['email']} at Inst ID 42...")
try:
    response = requests.post(f"{base_url}/auth/v2/faculty/login/", json=login_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

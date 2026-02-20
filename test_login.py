import requests
import json

base_url = "http://localhost:8000/api/users"

login_data = {
    "institution_id": 42,
    "identifier": "parnemanoharreddy19@gmail.com",
    "password": "Pandu@1919",
    "turnstile_token": "XXXX.DUMMY.TOKEN.XXXX"
}

print(f"Testing Student Login for {login_data['identifier']} at Inst ID 42...")
try:
    response = requests.post(f"{base_url}/auth/v2/student/login/", json=login_data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {json.dumps(dict(response.headers), indent=2)}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

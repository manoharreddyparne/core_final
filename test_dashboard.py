import requests
import json

# Replace with the access token from the previous login success
access_token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcxNjE1NjEzLCJpYXQiOjE3NzE2MTM4MTMsImp0aSI6ImE1ZDM4MmFiMDUyMzRlM2NiNTIzZjBhNTFhMTFjOGFiIiwidXNlcl9pZCI6MSwicm9sZSI6IlNUVURFTlQiLCJlbWFpbCI6InBhcm5lbWFub2hhcnJlZGR5MTlAZ21haWwuY29tIiwic2NoZW1hIjoiaW5zdF9tYWxsYXJlZGR5IiwidGVuYW50X3VzZXJfaWQiOjF9.AQvwNWL2-odyIwXHq2MrzQnGMwem3HSnBgPCpQSeMcMBCQnZEQBPNw60bXeQUyoV2C5jNQaMMkOREvSVajjKKg_s9Ec7pp4324R1jEoawFaGFeS_QGaVf_s1cH_nXMNXNNAhSwzAglgUY9x4PsoWPN7N9-K6qt-M1gjTzHgQN8Iwr5XAiXGpiX1O9RBeRnjjDgJoGzfPfEKHspz39beBTQcvdPI725EUIxc5wMFRii0kkzsm-4ehEYFOT1Zmqgcd6Sg6PIa92u_IbsSGndt3uSf5uiTt4BaQst7tNkK8cfLz_dqsmorsUztLcSqgN0rgDVTCQjbq_0jvLbDeDhUGNw"

headers = {
    "Authorization": f"Bearer {access_token}"
}

print("Testing Intelligence Dashboard...")
try:
    response = requests.get("http://localhost:8000/api/intelligence/dashboard/", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")

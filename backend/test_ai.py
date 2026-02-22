import os
import django
import time
from concurrent.futures import ThreadPoolExecutor

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from apps.core_brain.services import BrainOrchestrator
from apps.identity.models import User

# Get a test student user
user = User.objects.last()

if not user:
    print("No user found. Exiting.")
    exit()

print(f"Testing with user: {user.email}")

def send_request(i):
    prompt = f"This is test message number {i}. Reply with exactly one word acknowledging this number."
    start_time = time.time()
    try:
        response = BrainOrchestrator.get_llm_guidance(user, prompt)
        elapsed = time.time() - start_time
        print(f"Request {i:02d} | Time: {elapsed:.2f}s | Response: {response.strip() if response else 'None'}")
        return elapsed
    except Exception as e:
        print(f"Request {i:02d} | Failed with error: {e}")
        return None

# Sequential test to simulate conversation accurately and avoid hitting free tier limits instantly
total_start = time.time()
times = []

# Doing a loop of 20 requests
for i in range(1, 21):
    elapsed = send_request(i)
    if elapsed:
        times.append(elapsed)
    # Very short sleep to ensure strict sequential logging and avoid tripping basic flood protections
    time.sleep(0.5)

total_elapsed = time.time() - total_start
avg_time = sum(times) / len(times) if times else 0

print("\n--- TEST COMPLETE ---")
print(f"Total Requests: 20")
print(f"Average Response Time: {avg_time:.2f} seconds")
print(f"Total Test Duration: {total_elapsed:.2f} seconds")

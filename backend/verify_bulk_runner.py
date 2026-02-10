import os
import requests
import json
from django.core.management import execute_from_command_line

# Mock request since we want to test the view logic directly in shell if possible, 
# or just run a shell script that uses the view's internal logic.
# However, the most robust way is to use the Django test client or shell.

print("Starting bulk upload verification via Django shell...")

shell_commands = """
import os
import csv
import io
from django.test import RequestFactory
from apps.identity.views.admin.bulk_upload import BulkStudentUploadView
from apps.identity.models import User
from django.core.files.uploadedfile import SimpleUploadedFile

# 1. Get admin user
admin = User.objects.get(email='admin@auip-platform.com')

# 2. Prepare mock file
csv_path = 'c:/Manohar/AUIP/AUIP-Platform/backend/test_students.csv'
with open(csv_path, 'rb') as f:
    csv_file = SimpleUploadedFile('students.csv', f.read(), content_type='text/csv')

# 3. Mock request
factory = RequestFactory()
request = factory.post('/api/v1/auth/admin/bulk-seed-students/', {'file': csv_file})
request.user = admin

# 4. Call view
view = BulkStudentUploadView.as_view()
response = view(request)

print(f"Status Code: {response.status_code}")
print(f"Response Data: {response.data}")
"""

# Run it
with open('verify_bulk.py', 'w') as f:
    f.write(shell_commands)

print("Verification script created. Executing...")

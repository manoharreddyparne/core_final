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

from rest_framework.test import force_authenticate

# 3. Mock request
factory = RequestFactory()
request = factory.post('/api/v1/auth/admin/bulk-seed-students/', {'file': csv_file})
force_authenticate(request, user=admin)

# 4. Call view
view = BulkStudentUploadView.as_view()
response = view(request)

print(f"Status Code: {response.status_code}")
print(f"Response Data: {response.data}")

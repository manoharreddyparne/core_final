"""
Bulk Student Upload View - Admin only
"""

import csv
import io
import logging
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from django.db import transaction

from apps.identity.models.core import CoreStudent
from apps.identity.serializers.core_serializers import (
    CoreStudentBulkUploadSerializer,
    BulkUploadResponseSerializer
)
from apps.identity.utils.response_utils import success_response, error_response
from apps.identity.permissions import IsAdminRole

logger = logging.getLogger(__name__)


class BulkStudentUploadView(APIView):
    """
    Admin-only endpoint to bulk upload student data via CSV.
    """
    parser_classes = [MultiPartParser]
    permission_classes = [IsAdminRole]

    def post(self, request):
        if 'file' not in request.FILES:
            return error_response("CSV file required", status_code=status.HTTP_400_BAD_REQUEST)

        csv_file = request.FILES['file']
        if not csv_file.name.endswith('.csv'):
            return error_response("File must be a CSV", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = csv_file.read().decode('utf-8')
        except UnicodeDecodeError:
            return error_response("CSV must be UTF-8 encoded", status_code=status.HTTP_400_BAD_REQUEST)

        io_string = io.StringIO(decoded_file)
        reader = csv.DictReader(io_string)
        
        total_rows = 0
        successful = 0
        failed = 0
        errors = []
        created_refs = []

        with transaction.atomic():
            for row_idx, row in enumerate(reader, start=2):  # Start from 2 due to header
                total_rows += 1
                serializer = CoreStudentBulkUploadSerializer(data=row)
                
                if serializer.is_valid():
                    try:
                        # Clean numeric fields (empty string to None)
                        validated_data = serializer.validated_data
                        for field in ['cgpa', 'attendance_percentage']:
                            if field in row and row[field] == '':
                                validated_data[field] = None
                        
                        CoreStudent.objects.create(
                            **validated_data,
                            seeded_by=request.user.email
                        )
                        successful += 1
                        created_refs.append(validated_data['stu_ref'])
                    except Exception as e:
                        failed += 1
                        errors.append({
                            "row": row_idx,
                            "error": str(e),
                            "data": row
                        })
                else:
                    failed += 1
                    errors.append({
                        "row": row_idx,
                        "error": serializer.errors,
                        "data": row
                    })

        response_data = {
            "total_rows": total_rows,
            "successful": successful,
            "failed": failed,
            "errors": errors,
            "created_students": created_refs
        }
        
        logger.info(f"[BulkUpload] user={request.user.email} success={successful} fail={failed}")
        
        return success_response(
            "Bulk upload processed", 
            data=BulkUploadResponseSerializer(response_data).data
        )

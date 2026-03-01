import os
import django
import csv
import io
from decimal import Decimal
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings.development')
django.setup()

from django_tenants.utils import schema_context
from apps.auip_institution.models import StudentAcademicRegistry, StudentPreSeededRegistry
from django.db import transaction

csv_path = r'c:\Manohar\AUIP\AUIP-Platform\student_dataset_final_structured.csv'
schema = 'inst_andhra_university'

def to_decimal(val):
    try: return Decimal(str(val))
    except: return Decimal('0.00')

def to_int_or_none(val):
    try: return int(val) if val and str(val).strip().isdigit() else None
    except: return None

def to_date_or_none(val):
    if not val or not str(val).strip(): return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            from datetime import datetime
            return datetime.strptime(str(val).strip(), fmt).date()
        except: pass
    return None

print(f"Starting diagnostic upload for schema: {schema}")

try:
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        print(f"Total rows found in CSV: {len(rows)}")

    with schema_context(schema):
        from django.db import connection
        print(f"Current Schema in DB: {connection.schema_name}")
        initial_count = StudentAcademicRegistry.objects.count()
        print(f"Initial Count in {schema}: {initial_count}")
        
        with transaction.atomic():
            success_count = 0
            error_count = 0
            skipped_count = 0
            
            # Test first 10 rows
            for i, row in enumerate(rows[:10]):
                roll = row.get('roll_number', '').strip()
                if not roll: continue
                
                exists = StudentAcademicRegistry.objects.filter(roll_number__iexact=roll).exists()
                print(f"Row {i} | Roll: {roll} | Exists: {exists}")
                
                if not exists:
                    try:
                        data = {
                            "full_name": row.get('full_name', 'Unknown').strip(),
                            "official_email": row.get('official_email', '').strip(),
                            "personal_email": row.get('personal_email', '').strip() or None,
                            "phone_number": row.get('phone_number', '').strip() or None,
                            "program": row.get('program', 'B.Tech').strip(),
                            "branch": row.get('branch', 'CSE').strip(),
                            "batch_year": int(row.get('batch_year')) if row.get('batch_year') and str(row.get('batch_year')).strip().isdigit() else timezone.now().year,
                            "admission_year": to_int_or_none(row.get('admission_year')),
                            "passout_year": to_int_or_none(row.get('passout_year')),
                            "section": row.get('section', 'A').strip(),
                            "cgpa": to_decimal(row.get('cgpa')) if row.get('cgpa') else Decimal('0.00'),
                            "current_semester": int(row.get('current_semester')) if row.get('current_semester') and str(row.get('current_semester')).strip().isdigit() else 1,
                            "date_of_birth": to_date_or_none(row.get('date_of_birth')),
                            "history_data": {
                                "10th_percent": float(row.get("10th_percent", 0)) if str(row.get("10th_percent", "")).replace(".","",1).isdigit() else 0.0,
                                "12th_percent": float(row.get("12th_percent", 0)) if str(row.get("12th_percent", "")).replace(".","",1).isdigit() else 0.0,
                                "active_backlogs": int(float(row.get("active_backlogs", 0))) if str(row.get("active_backlogs", "")).replace(".","",1).isdigit() else 0,
                            }
                        }
                        StudentAcademicRegistry.objects.create(roll_number=roll, **data)
                        success_count += 1
                        print(f"Created {roll}")
                    except Exception as e:
                        print(f"Error creating {roll}: {e}")
                        error_count += 1
                else:
                    skipped_count += 1
                
            print(f"Test Complete: {success_count} created, {skipped_count} skipped, {error_count} errors.")
            print(f"Final Count in {schema}: {StudentAcademicRegistry.objects.count()}")

except Exception as global_e:
    print(f"Global Failure: {global_e}")

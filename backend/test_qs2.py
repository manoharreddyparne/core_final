import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auip_core.settings')
django.setup()
from django_tenants.utils import schema_context
from apps.auip_institution.models import StudentAcademicRegistry
from apps.placement.models import PlacementDrive
from apps.placement.services.eligibility_engine import EligibilityEngine

with schema_context('inst_mallareddy'):
    drive = PlacementDrive(
        min_10th_percent=65.0,
        min_12th_percent=90.0,
        min_cgpa=7.5,
        min_ug_percentage=0.0,
        eligible_branches=["CSE", "IT", "ECE"],
        allowed_active_backlogs=0,
        manual_students=[]
    )
    qs = EligibilityEngine.get_manifest_preview_qs(drive)
    print("Preview Eligible:", qs.count())
    
    # Emulate the final_qs
    from django.db.models import Exists, OuterRef
    from apps.auip_institution.models import StudentAuthorizedAccount
    final_qs = qs.annotate(
        is_activated=Exists(StudentAuthorizedAccount.objects.filter(academic_ref=OuterRef('pk')))
    ).values('id', 'roll_number', 'full_name', 'branch', 'cgpa', 'is_activated').order_by('-is_activated', 'roll_number')

    print("Final qs:", final_qs.count())
    if final_qs:
        print("First:", final_qs[0])

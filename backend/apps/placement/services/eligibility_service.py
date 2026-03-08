from typing import List, Tuple
from apps.auip_institution.models import StudentAcademicRegistry
from apps.placement.models import PlacementDrive
import logging

logger = logging.getLogger(__name__)

class EligibilityService:
    """
    Core Logic Engine for determining student eligibility for placement drives.
    Supports basic filtering and will be expanded for complex AND/OR logic.
    """

    @staticmethod
    def filter_eligible_students(drive: PlacementDrive):
        """
        Returns a queryset of students matching the drive's criteria.
        """
        queryset = StudentAcademicRegistry.objects.all()
        
        # 📊 CGPA Filtering
        if drive.min_cgpa > 0:
            queryset = queryset.filter(cgpa__gte=drive.min_cgpa)
            
        # 🏛️ Branch Filtering
        if drive.eligible_branches and len(drive.eligible_branches) > 0:
            queryset = queryset.filter(branch__in=drive.eligible_branches)
            
        # 🎓 Batch Year Filtering
        if drive.eligible_batches and len(drive.eligible_batches) > 0:
            queryset = queryset.filter(batch_year__in=drive.eligible_batches)
            
        return queryset

    @staticmethod
    def evaluate_student(student: StudentAcademicRegistry, drive: PlacementDrive) -> Tuple[bool, str]:
        """
        Evaluates a single student using the unified EligibilityEngine.
        """
        from apps.placement.services.eligibility_engine import EligibilityEngine
        
        # Use the central engine for consistent branch/CGPA matching
        is_eligible = EligibilityEngine.is_student_eligible(drive, student.id)
        
        if not is_eligible:
            return False, "Intelligence analysis suggests you do not meet the criteria for this drive."
            
        # 🧠 Governance Brain Checks (Readiness & Behavior)
        from apps.governance.models import StudentIntelligenceProfile
        intel_profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # Thresholds
        MIN_READINESS = 40 
        MIN_BEHAVIOR = 30
        
        if intel_profile.readiness_score < MIN_READINESS:
            return False, f"Your AI Readiness Score ({intel_profile.readiness_score}) is below the institutional threshold."
            
        if intel_profile.behavior_score < MIN_BEHAVIOR:
            return False, f"Your Behavior/Engagement score ({intel_profile.behavior_score}) is too low."

        return True, "Congratulations! You are eligible for this drive."

    @staticmethod
    def get_eligible_drives_for_student(student: StudentAcademicRegistry):
        """
        Retrieves all ACTIVE drives a specific student is eligible for.
        """
        from django.utils import timezone
        from apps.placement.services.eligibility_engine import EligibilityEngine
        
        active_drives = PlacementDrive.objects.filter(status='ACTIVE', deadline__gt=timezone.now())
        
        eligible_ids = []
        for drive in active_drives:
            if EligibilityEngine.is_student_eligible(drive, student.id):
                eligible_ids.append(drive.id)
                
        return PlacementDrive.objects.filter(id__in=eligible_ids)

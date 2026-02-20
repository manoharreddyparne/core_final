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
        Evaluates a single student and returns (is_eligible, failure_reason).
        Used for providing feedback to students on their dashboard.
        """
        # CGPA Check
        if drive.min_cgpa > 0 and (student.cgpa or 0) < drive.min_cgpa:
            return False, f"Your CGPA ({student.cgpa}) is below the required {drive.min_cgpa}."
            
        # Branch Check
        if drive.eligible_branches and student.branch not in drive.eligible_branches:
            return False, f"Your branch ({student.branch}) is not included in this drive's requirements."
            
        # Batch Check
        if drive.eligible_batches and student.batch_year not in drive.eligible_batches:
            return False, f"Students from batch {student.batch_year} are not eligible for this drive."
            
        # 🧠 Governance Brain Checks (Readiness & Behavior)
        from apps.governance.models import StudentIntelligenceProfile
        intel_profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # Thresholds (Could be drive-specific in future, using defaults for now)
        MIN_READINESS = 40 
        MIN_BEHAVIOR = 30
        
        if intel_profile.readiness_score < MIN_READINESS:
            return False, f"Your AI Readiness Score ({intel_profile.readiness_score}) is below the institutional threshold ({MIN_READINESS}). Please complete more mock activities."
            
        if intel_profile.behavior_score < MIN_BEHAVIOR:
            return False, f"Your Behavior/Engagement score ({intel_profile.behavior_score}) is too low. Consistent portal activity is required for placement eligibility."

        return True, "Congratulations! You are eligible for this drive."

    @staticmethod
    def get_eligible_drives_for_student(student: StudentAcademicRegistry):
        """
        Retrieves all ACTIVE drives a specific student is eligible for.
        """
        from django.utils import timezone
        active_drives = PlacementDrive.objects.filter(status='ACTIVE', deadline__gt=timezone.now())
        
        eligible_ids = []
        for drive in active_drives:
            is_eligible, _ = EligibilityService.evaluate_student(student, drive)
            if is_eligible:
                eligible_ids.append(drive.id)
                
        return PlacementDrive.objects.filter(id__in=eligible_ids)

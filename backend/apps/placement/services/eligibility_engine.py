from typing import List, Dict, Any
from django.db.models import F, Q, ExpressionWrapper, DecimalField
from asgiref.sync import sync_to_async
from apps.placement.models import PlacementDrive, PlacementApplication
from apps.auip_institution.models import StudentAcademicRegistry, StudentAuthorizedAccount

class EligibilityEngine:
    """
    Core engine for dynamic criteria filtering. Runs against the Institutional 
    Student Academic Registry (the strict source of truth).
    """
    
    @staticmethod
    def get_eligible_students_qs(drive: PlacementDrive):
        """
        Builds the complex query logic to fetch eligible student objects.
        Uses Intelligent Fuzzy Matching for branches and criteria.
        """
        # Admin View: We look at the entire Academic Registry.
        # We don't filter by is_active=True here because TPOs want to see potential reach.
        base_qs = StudentAcademicRegistry.objects.all()

        filters = Q()

        # 1. 10th & 12th Percentage
        if drive.min_10th_percent and drive.min_10th_percent > 0:
            filters &= Q(history_data__10th_percent__gte=float(drive.min_10th_percent))
            
        if drive.min_12th_percent and drive.min_12th_percent > 0:
            filters &= Q(history_data__12th_percent__gte=float(drive.min_12th_percent))

        # 2. CGPA Check
        if drive.min_cgpa and drive.min_cgpa > 0:
            filters &= Q(cgpa__gte=drive.min_cgpa)

        # 3. Active Backlogs
        if drive.allowed_active_backlogs is not None:
             filters &= (
                 Q(history_data__active_backlogs__isnull=True) | 
                 Q(history_data__active_backlogs__lte=drive.allowed_active_backlogs)
             )

        # 4. 🧠 Intelligent Fuzzy Branch Matching
        if drive.eligible_branches:
            branch_q = Q()
            for b_req in drive.eligible_branches:
                # Extracts acronyms like 'CSE' from 'Computer Science (CSE)'
                import re
                acronym_match = re.search(r'\((.*?)\)', b_req)
                if acronym_match:
                    acronym = acronym_match.group(1).strip()
                    # Match if student branch is CSE OR if it contains Computer Science
                    branch_q |= Q(branch__iexact=acronym) | Q(branch__icontains=b_req.split('(')[0].strip())
                else:
                    branch_q |= Q(branch__icontains=b_req)
            filters &= branch_q
            
        # 5. Batches
        if drive.eligible_batches:
            filters &= Q(passout_year__in=drive.eligible_batches)

        return base_qs.filter(filters)

    @staticmethod
    def get_qualified_students_qs(drive: PlacementDrive):
        """
        Returns the final set of students for this drive:
        Those who meet strict criteria + Those manually authorized (Applied).
        """
        criteria_qs = EligibilityEngine.get_eligible_students_qs(drive)
        # Manual candidates are those who already have an application record
        manual_stu_ids = PlacementApplication.objects.filter(drive=drive).values_list('student_id', flat=True)
        
        return StudentAcademicRegistry.objects.filter(
            Q(id__in=criteria_qs.values_list('id', flat=True)) | 
            Q(id__in=manual_stu_ids)
        ).distinct()

    @staticmethod
    def get_eligibility_report(drive: PlacementDrive) -> Dict[str, Any]:
        """
        Generates analytics of qualified students (Criteria Eligible + Manual Adds).
        """
        combined_qs = EligibilityEngine.get_qualified_students_qs(drive)
        manual_stu_ids = list(PlacementApplication.objects.filter(drive=drive).values_list('student_id', flat=True))
        
        total = combined_qs.count()
        
        # 📊 Branch-wise split
        branch_counts = {}
        if drive.eligible_branches:
            import re
            for b_req in drive.eligible_branches:
                acronym_match = re.search(r'\((.*?)\)', b_req)
                if acronym_match:
                    acronym = acronym_match.group(1).strip()
                    count = combined_qs.filter(Q(branch__iexact=acronym) | Q(branch__icontains=b_req.split('(')[0].strip())).count()
                else:
                    count = combined_qs.filter(branch__icontains=b_req).count()
                branch_counts[b_req] = count
        else:
            from django.db.models import Count
            breakdown = combined_qs.values('branch').annotate(count=Count('id'))
            branch_counts = {item['branch']: item['count'] for item in breakdown}

        return {
            "total_eligible": total,
            "branch_breakdown": branch_counts,
            "eligible_students": [
                {
                    "roll_number": s.roll_number,
                    "full_name": s.full_name,
                    "branch": s.branch,
                    "cgpa": float(s.cgpa) if s.cgpa else 0.0,
                    "is_manual": s.id in manual_stu_ids
                } for s in combined_qs.all()[:100]
            ]
        }

    @staticmethod
    def broadcast_invitations(drive: PlacementDrive):
        """
        Fires notifications to all qualified students (Eligible + Manual Adds).
        """
        from apps.notifications.services import NotificationDispatcher
        qualified_qs = EligibilityEngine.get_qualified_students_qs(drive)
        
        for registry in qualified_qs.iterator(chunk_size=100):
            try:
                if hasattr(registry, 'studentauthorizedaccount'):
                    account = registry.studentauthorizedaccount
                    NotificationDispatcher.send_notification(
                        user=account,
                        title=f"Placement Alert: {drive.company_name}",
                        message=f"Invitation for {drive.role} at {drive.company_name}. Check the Hub and apply/verify your status!",
                        type='PLACEMENT',
                        action_link=f"/placement-hub/drives/{drive.id}"
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[ELIGIBILITY-BROADCAST-ERR] Failed: {str(e)}")
                
        # Mark drive as broadcasted to prevent spam
        drive.is_broadcasted = True
        drive.save(update_fields=['is_broadcasted', 'updated_at'])

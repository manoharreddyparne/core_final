from typing import List, Dict, Any
from django.db.models import F, Q, ExpressionWrapper, DecimalField, Count
from asgiref.sync import sync_to_async
from apps.placement.models import PlacementDrive, PlacementApplication
from apps.auip_institution.models import StudentAcademicRegistry, StudentAuthorizedAccount
import logging
import uuid

logger = logging.getLogger(__name__)


class EligibilityEngine:
    """
    Core engine for dynamic criteria filtering. Runs against the Institutional 
    Student Academic Registry (the strict source of truth).
    
    Key principle: ALL eligible students are considered regardless of activation status.
    - Active students → UI notification + email
    - Inactive students → email only (with activation link)
    """
    
    # Exact key names as stored by _csv_utils.py clean_row()
    TENTH_KEYS  = ['10th_percent', 'ssc_percent', 'ssc_percentage', 'tenth_percent']
    TWELFTH_KEYS = ['12th_percent', 'inter_percent', 'inter_percentage', 'hsc_percent', 'twelfth_percent']

    @staticmethod
    def _split_branch_spec(spec: str) -> list:
        """
        Split a compound branch specification into individual tokens.
        'CS/IT Engineering' → ['CS', 'IT', 'Engineering']
        'CSE and ECE' → ['CSE', 'ECE']
        """
        import re as _re
        # Split on /, &, 'and', comma, and extra spaces
        parts = _re.split(r'[/&,]|\band\b', spec, flags=_re.IGNORECASE)
        # Strip each part, remove 'Engineering'/'Graduate' noise words, keep meaningful tokens
        tokens = []
        noise = {'engineering', 'graduate', 'degree', 'science', 'technology'}
        for p in parts:
            p = p.strip()
            if p and p.lower() not in noise:
                tokens.append(p)
        return tokens if tokens else [spec]

    @staticmethod
    def get_eligible_students_qs(drive: PlacementDrive):
        """
        Builds the complex query logic to fetch eligible student objects.
        Step-by-step filter with diagnostics logged at each stage.
        """
        base_qs = StudentAcademicRegistry.objects.all()
        filters = Q()
        logger.info(f"[ELIGIBILITY] Total students in registry: {base_qs.count()}")

        # ── 1. 10th % ────────────────────────────────────────────────────────
        if drive.min_10th_percent and float(drive.min_10th_percent) > 0:
            val = float(drive.min_10th_percent)
            
            # Smart scale detection: if threshold is GPA-scale (val <= 10) but registry data is percentage-scale (e.g. 70-100)
            # multiply by 9.5 to prevent matching everybody (too lenient)
            if val <= 10.0:
                logger.info(f"[ELIGIBILITY] Auto-scaling 10th% threshold {val} -> {val * 9.5} (detected GPA scale)")
                val = val * 9.5

            tenth_q = Q()
            for key in EligibilityEngine.TENTH_KEYS:
                tenth_q |= Q(**{f'history_data__{key}__gte': val})
            filters &= tenth_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After 10th% >= {val}: {count_after} remain")

            # Sample diagnostic
            for s in base_qs[:3]:
                hd = s.history_data or {}
                logger.info(f"[ELIGIBILITY-SAMPLE] {s.roll_number} 10th keys: { {k: hd.get(k, 'MISSING') for k in EligibilityEngine.TENTH_KEYS} }")

        # ── 2. 12th % ────────────────────────────────────────────────────────
        if drive.min_12th_percent and float(drive.min_12th_percent) > 0:
            val = float(drive.min_12th_percent)
            
            if val <= 10.0:
                logger.info(f"[ELIGIBILITY] Auto-scaling 12th% threshold {val} -> {val * 9.5} (detected GPA scale)")
                val = val * 9.5

            twelfth_q = Q()
            for key in EligibilityEngine.TWELFTH_KEYS:
                twelfth_q |= Q(**{f'history_data__{key}__gte': val})
            filters &= twelfth_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After 12th% >= {val}: {count_after} remain")

        # ── 3. CGPA / UG% ────────────────────────────────────────────────────
        if (drive.min_cgpa and float(drive.min_cgpa) > 0) or (drive.min_ug_percentage and float(drive.min_ug_percentage) > 0):
            min_cgpa = float(drive.min_cgpa or 0.0)
            min_ug   = float(drive.min_ug_percentage or 0.0)
            multiplier = float(drive.cgpa_to_percentage_multiplier or 9.5)

            perf_q = Q()
            if min_cgpa > 0:
                perf_q |= Q(cgpa__gte=min_cgpa)
            if min_ug > 0:
                converted_cgpa = min_ug / multiplier
                perf_q |= Q(cgpa__gte=converted_cgpa)
                perf_q |= Q(history_data__ug_percentage__gte=min_ug)

            filters &= perf_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After CGPA/UG%: {count_after} remain")

        # ── 4. Active Backlogs ───────────────────────────────────────────────
        if drive.allowed_active_backlogs is not None:
            backlog_q = (
                Q(history_data__active_backlogs__isnull=True) |
                Q(history_data__active_backlogs__lte=drive.allowed_active_backlogs)
            )
            filters &= backlog_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After backlogs <= {drive.allowed_active_backlogs}: {count_after} remain")

        # ── 5. Branch Matching (Bidirectional + compound spec splitting) ──────
        if drive.eligible_branches:
            import re as _re
            branch_q = Q()
            for b_req in drive.eligible_branches:
                # Split compound specs like 'CS/IT Engineering' into ['CS', 'IT']
                tokens = EligibilityEngine._split_branch_spec(b_req)
                logger.info(f"[ELIGIBILITY] Branch spec '{b_req}' → tokens: {tokens}")
                
                for token in tokens:
                    # Forward: student's branch contains the token
                    branch_q |= Q(branch__icontains=token)
                    # Also exact match on full spec
                branch_q |= Q(branch__iexact=b_req)

            filters &= branch_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After branch filter {drive.eligible_branches}: {count_after} remain")

        # ── 6. Batches ───────────────────────────────────────────────────────
        if drive.eligible_batches:
            filters &= (Q(passout_year__in=drive.eligible_batches) | Q(batch_year__in=drive.eligible_batches))
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After batch filter {drive.eligible_batches}: {count_after} remain")

        final = base_qs.filter(filters)
        logger.info(f"[ELIGIBILITY] FINAL: {final.count()} eligible")
        return final


    @staticmethod
    def get_qualified_students_qs(drive: PlacementDrive):
        """
        Returns the final set of students for this drive:
        Those who meet strict criteria + Manual Inclusions - Manual Exclusions.
        """
        # 1. Criteria Based Base List
        criteria_qs_ids = list(EligibilityEngine.get_eligible_students_qs(drive).values_list('roll_number', flat=True))
        
        # 2. Add Force-Inclusions (Manual additions from the UI list)
        manual_inclusions = drive.manual_students or []
        
        # 3. Handle Applied students (only if drive is already saved)
        applied_roll_numbers = []
        if drive.id:
            applied_roll_numbers = list(PlacementApplication.objects.filter(drive=drive).values_list('student__roll_number', flat=True))
        
        # Combined Set
        final_roll_set = set(criteria_qs_ids) | set(manual_inclusions) | set(applied_roll_numbers)
        
        # 4. Remove Exclusions
        exclusions = drive.excluded_rolls or []
        for roll in exclusions:
            if roll in final_roll_set:
                final_roll_set.remove(roll)
                
        return StudentAcademicRegistry.objects.filter(roll_number__in=final_roll_set).distinct()

    @staticmethod
    def get_eligibility_report(drive: PlacementDrive) -> Dict[str, Any]:
        """
        Generates analytics of qualified students (Criteria Eligible + Manual Adds).
        """
        combined_qs = EligibilityEngine.get_qualified_students_qs(drive)
        manual_stu_ids = []
        if drive.id:
            manual_stu_ids = list(PlacementApplication.objects.filter(drive=drive).values_list('student_id', flat=True))
        
        total = combined_qs.count()
        
        # Branch-wise split
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
            breakdown = combined_qs.values('branch').annotate(count=Count('id'))
            branch_counts = {item['branch']: item['count'] for item in breakdown}

        # Split active vs inactive
        active_ids = set(
            StudentAuthorizedAccount.objects.filter(
                academic_ref__in=combined_qs, is_active=True
            ).values_list('academic_ref_id', flat=True)
        )
        
        return {
            "total_eligible": total,
            "active_count": len(active_ids),
            "inactive_count": total - len(active_ids),
            "branch_breakdown": branch_counts,
            "eligible_students": [
                {
                    "roll_number": s.roll_number,
                    "full_name": s.full_name,
                    "branch": s.branch,
                    "cgpa": float(s.cgpa) if s.cgpa else 0.0,
                    "email": s.official_email or s.personal_email or "",
                    "is_active": s.id in active_ids,
                    "is_manual": s.id in manual_stu_ids
                } for s in combined_qs.all()[:200]
            ]
        }

    @staticmethod
    def broadcast_invitations(drive: PlacementDrive):
        """
        Fires notifications to ALL qualified students:
        - Active accounts → UI notification + email
        - Inactive accounts → email only with activation prompt
        Also auto-creates a placement group chat for this drive.
        """
        from apps.notifications.services import NotificationDispatcher
        from django.conf import settings
        
        qualified_qs = EligibilityEngine.get_qualified_students_qs(drive)
        
        # Build lookup of active account IDs
        active_account_map = {}
        for acct in StudentAuthorizedAccount.objects.filter(academic_ref__in=qualified_qs).select_related('academic_ref'):
            active_account_map[acct.academic_ref_id] = acct
        
        notified_active = 0
        notified_inactive = 0
        email_errors = 0
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        for registry in qualified_qs.iterator(chunk_size=100):
            try:
                acct = active_account_map.get(registry.id)
                # Primary communications
                emails = set()
                if registry.official_email: emails.add(registry.official_email)
                if registry.personal_email: emails.add(registry.personal_email)
                
                if acct and acct.is_active:
                    # ✅ ACTIVE STUDENT: UI notification + email
                    NotificationDispatcher.send_notification(
                        user=acct,
                        title=f"🎯 Placement Alert: {drive.company_name}",
                        message=(
                            f"You are eligible for {drive.role} at {drive.company_name}! "
                            f"Package: {drive.package_details or 'To be announced'}. "
                            f"Deadline: {drive.deadline}. Apply now in the Placement Hub."
                        ),
                        type='PLACEMENT',
                        action_link=f"/placement-hub"
                    )
                    notified_active += 1
                    
                elif emails:
                    # ⚠️ INACTIVE STUDENT: Email-only with activation prompt (Send to all known emails)
                    for target_email in emails:
                        EligibilityEngine._send_inactive_student_email(
                            email=target_email,
                            student_name=registry.full_name,
                            company_name=drive.company_name,
                            role=drive.role,
                            package=drive.package_details or "To be announced",
                            deadline=str(drive.deadline),
                            frontend_url=frontend_url,
                        )
                    notified_inactive += 1
                    
            except Exception as e:
                email_errors += 1
                logger.error(f"[ELIGIBILITY-BROADCAST-ERR] Student {registry.roll_number}: {str(e)}")
                
        # Mark drive as broadcasted
        drive.is_broadcasted = True
        
        # Auto-create placement group for this drive
        group_info = EligibilityEngine._create_drive_group(drive, qualified_qs)
        drive.chat_session_id = group_info.get('session_id')
        drive.save(update_fields=['is_broadcasted', 'chat_session_id', 'updated_at'])
        
        # Create SocialPost Alert
        try:
            from apps.social.models import SocialPost
            SocialPost.objects.create(
                author_id=0, # System author
                author_role='ADMIN',
                author_name='Placement Hub',
                content=f"🎯 NEW PLACEMENT DRIVE: {drive.company_name} is hiring for {drive.role}!\n\nPackage: {drive.package_details or 'LPA'}\nEligibility: {drive.min_cgpa} CGPA | {', '.join(drive.eligible_branches or [])}\nDeadline: {drive.deadline}\n\nApply now via the Placement Hub!",
                post_type='PLACEMENT',
                drive_id=drive.id
            )
        except Exception as e:
            logger.error(f"[SOCIAL-POST-ERR] Failed to create for drive {drive.id}: {str(e)}")
        
        logger.info(
            f"[BROADCAST-COMPLETE] Drive={drive.company_name} | "
            f"Active={notified_active} | Inactive(email)={notified_inactive} | "
            f"Errors={email_errors} | Group={group_info.get('session_id', 'N/A')}"
        )
        
        return {
            "notified_active": notified_active,
            "notified_inactive": notified_inactive,
            "email_errors": email_errors,
            "group": group_info,
        }
    
    @staticmethod
    def _send_inactive_student_email(
        email: str,
        student_name: str,
        company_name: str,
        role: str,
        package: str,
        deadline: str,
        frontend_url: str
    ):
        """
        Sends a targeted email to students who haven't activated their accounts,
        informing them of eligibility and prompting activation.
        """
        from django.core.mail import send_mail
        from django.conf import settings
        
        subject = f"🎯 You're eligible for {company_name} — Activate your AUIP account!"
        
        from django.template.loader import render_to_string
        from django.utils.html import strip_tags
        
        subject = f"🎯 You're eligible for {company_name} — Activate your AUIP account!"
        
        # Build HTML content
        html_content = f"""
        <div style="font-family: 'Inter', sans-serif; background: #0a0b10; color: #ffffff; padding: 40px; border-radius: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #6366f1; margin: 0;">AUIP Intelligence Hub</h1>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Secure Placement Orchestrator</p>
            </div>
            
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 24px;">
                <h2 style="margin-top: 0; color: #ffffff;">Hello {student_name},</h2>
                <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6;">
                    Our Neural Core has matched your profile with a new recruitment venture. You are <strong>QUALIFIED</strong> for the following opportunity:
                </p>
                
                <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">Company</td>
                        <td style="padding: 10px 0; color: #ffffff; font-weight: 700;">{company_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">Role</td>
                        <td style="padding: 10px 0; color: #6366f1; font-weight: 700;">{role}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">Package</td>
                        <td style="padding: 10px 0; color: #10b981; font-weight: 700;">{package}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; font-weight: 800;">Deadline</td>
                        <td style="padding: 10px 0; color: #f43f5e; font-weight: 700;">{deadline}</td>
                    </tr>
                </table>
                
                <div style="margin-top: 30px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 13px; margin-bottom: 15px;">Your account is currently <strong>INACTIVE</strong>. Activate now to claim your spot.</p>
                    <a href="{frontend_url}/activate-request" style="background: #6366f1; color: #ffffff; padding: 14px 40px; border-radius: 14px; text-decoration: none; font-weight: 900; letter-spacing: 1px; display: inline-block;">ACTIVATE ACCOUNT</a>
                </div>
            </div>
            
            <p style="text-align: center; color: #475569; font-size: 11px; margin-top: 40px;">
                &copy; 2026 AUIP Professional Hub. All rights reserved. <br/>
                This is an automated match generated by the AUIP Placement Intelligence Engine.
            </p>
        </div>
        """
        message = strip_tags(html_content)
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_content,
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"[INACTIVE-EMAIL-ERR] Failed to send to {email}: {str(e)}")
    
    @staticmethod
    def _create_drive_group(drive: PlacementDrive, eligible_qs):
        """
        Auto-creates a ChatSession group for this placement drive.
        All eligible students + admins/faculty are auto-added.
        Returns group info with invite link.
        """
        from apps.social.models import ChatSession
        from apps.auip_institution.models import FacultyAuthorizedAccount
        from django.conf import settings
        
        # Check if group already exists for this drive
        existing = ChatSession.objects.filter(
            is_group=True,
            name__icontains=f"[Drive-{drive.id}]"
        ).first()
        
        if existing:
            return {
                "session_id": str(existing.session_id),
                "invite_link": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?group={existing.session_id}",
                "already_existed": True,
            }
        
        # Build participants list
        participants = []
        
        # Add eligible students
        for reg in eligible_qs.all()[:500]:
            participants.append({
                "id": reg.id,
                "role": "STUDENT",
                "name": reg.full_name or reg.roll_number,
            })
        
        # Add all active faculty/admin
        for faculty in FacultyAuthorizedAccount.objects.filter(is_active=True).select_related('registry_ref'):
            participants.append({
                "id": faculty.registry_ref_id,
                "role": "FACULTY",
                "name": faculty.first_name or "Faculty",
            })
        
        invite_token = uuid.uuid4().hex[:16]
        
        group = ChatSession.objects.create(
            is_group=True,
            name=f"[Drive-{drive.id}] {drive.company_name} — {drive.role}",
            participants=participants,
            participants_metadata={
                "drive_id": drive.id,
                "company": drive.company_name,
                "role": drive.role,
                "created_by": "SYSTEM",
                "auto_generated": True,
                "read_only_for_students": True, # Gated announcement mode
            },
            invite_link_token=invite_token,
        )
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        return {
            "session_id": str(group.session_id),
            "invite_link": f"{frontend_url}/chat-hub?group={group.session_id}",
            "invite_token": invite_token,
            "participants_count": len(participants),
            "already_existed": False,
        }

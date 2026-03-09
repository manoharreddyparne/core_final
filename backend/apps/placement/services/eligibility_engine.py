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

            # Build OR-based filter — student must pass AT LEAST ONE criterion
            # IMPORTANT: cgpa field is nullable — a student with null cgpa is excluded
            # by SQL NULL >= X checks, so we explicitly allow null cgpa students only
            # when CGPA is not the sole criterion (i.e., also check sgpa_history/history_data).
            perf_clauses = []

            if min_cgpa > 0:
                # Primary: cgpa field >= threshold
                # Also check history_data->cgpa in case cgpa field isn't populated yet
                perf_clauses.append(
                    Q(cgpa__gte=min_cgpa) |
                    Q(history_data__cgpa__gte=min_cgpa)
                )

            if min_ug > 0:
                converted_cgpa = min_ug / multiplier
                perf_clauses.append(
                    Q(cgpa__gte=converted_cgpa) |
                    Q(history_data__cgpa__gte=converted_cgpa) |
                    Q(history_data__ug_percentage__gte=min_ug)
                )

            if perf_clauses:
                # Combine all clauses with OR — student only needs to satisfy one
                combined_perf_q = perf_clauses[0]
                for clause in perf_clauses[1:]:
                    combined_perf_q |= clause
                filters &= combined_perf_q

            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After CGPA/UG% (cgpa>={min_cgpa}, ug>={min_ug}): {count_after} remain")


        # ── 4. Active Backlogs ───────────────────────────────────────────────
        if drive.allowed_active_backlogs is not None and int(drive.allowed_active_backlogs) >= 0:
            allowed = int(drive.allowed_active_backlogs)
            # SAFE backlog filter: avoid ~Q(has_key=...) which can produce
            # broken NOT EXISTS subqueries when combined with other JSONField ORs.
            # Instead: student passes if active_backlogs is null/missing OR <= allowed.
            backlog_q = (
                Q(history_data__active_backlogs__isnull=True) |    # null field value
                Q(history_data__active_backlogs__lte=allowed)       # 0 or within limit
            )
            filters &= backlog_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After backlogs <= {allowed}: {count_after} remain")

        # ── 5. Branch Matching (Bidirectional + compound spec splitting) ──────
        if drive.eligible_branches:
            branch_q = Q()
            for b_req in drive.eligible_branches:
                tokens = EligibilityEngine._split_branch_spec(b_req)
                logger.info(f"[ELIGIBILITY] Branch spec '{b_req}' → tokens: {tokens}")
                for token in tokens:
                    branch_q |= Q(branch__icontains=token)
                branch_q |= Q(branch__iexact=b_req)

            filters &= branch_q
            count_after = base_qs.filter(filters).count()
            logger.info(f"[ELIGIBILITY] After branch filter {drive.eligible_branches}: {count_after} remain")

        # ── 6. Batches ───────────────────────────────────────────────────────
        # Only apply if batches are specified AND the filter doesn't wipe everyone out.
        # passout_year / batch_year may not be populated for all students.
        if drive.eligible_batches:
            batch_q = Q(passout_year__in=drive.eligible_batches) | Q(batch_year__in=drive.eligible_batches)
            batch_count = base_qs.filter(filters & batch_q).count()
            logger.info(f"[ELIGIBILITY] Batch filter {drive.eligible_batches} would leave {batch_count}")
            if batch_count > 0:
                # Only apply if it actually produces results
                filters &= batch_q
            else:
                logger.warning(f"[ELIGIBILITY] Batch filter eliminated ALL students — SKIPPING batch filter. "
                               f"Batches {drive.eligible_batches} likely not populated in registry.")



        final = base_qs.filter(filters)
        logger.info(f"[ELIGIBILITY] FINAL: {final.count()} eligible")
        return final

    @staticmethod
    def is_student_eligible(drive, student_profile_id):
        """
        Check if a student is eligible for the drive.
        student_profile_id can be either:
        - StudentAcademicRegistry.id (from get_profile_id for STUDENT role)
        - StudentAuthorizedAccount.id (legacy callers)
        We try registry first, then fall back to authorized account lookup.
        """
        from apps.auip_institution.models import StudentAuthorizedAccount
        
        # First try: Direct registry ID match (this is what get_profile_id returns)
        qs = EligibilityEngine.get_qualified_students_qs(drive)
        if qs.filter(id=student_profile_id).exists():
            return True
        
        # Fallback: Maybe it's an AuthorizedAccount ID
        account = StudentAuthorizedAccount.objects.filter(id=student_profile_id).first()
        if account and account.academic_ref_id:
            return qs.filter(id=account.academic_ref_id).exists()
            
        return False



    @staticmethod
    def get_qualified_students_qs(drive: PlacementDrive):
        """
        Returns the final set of students for this drive:
        Those who meet strict criteria + Manual Inclusions - Manual Exclusions.
        USED FOR FINAL BROADCASTING.
        """
        # 1. Base Pool Calculation
        print(f"[ENGINE] Mode: {'INCLUSION' if drive.is_inclusion_mode else 'EXCLUSION'}")
        if drive.is_inclusion_mode:
            # ONLY explicitly included + Manual adds
            final_roll_set = set(drive.included_rolls or []) | set(drive.manual_students or [])
            print(f"[ENGINE] Inclusion rolls count: {len(drive.included_rolls or [])}")
        else:
            # Criteria based + Manual adds - Exclusions
            criteria_qs_ids = list(EligibilityEngine.get_eligible_students_qs(drive).values_list('roll_number', flat=True))
            final_roll_set = set(criteria_qs_ids) | set(drive.manual_students or [])
            print(f"[ENGINE] Criteria match count: {len(criteria_qs_ids)}")
            
            # Remove Exclusions
            exclusions = drive.excluded_rolls or []
            print(f"[ENGINE] Exclusion rolls count: {len(exclusions)}")
            for roll in exclusions:
                if roll in final_roll_set:
                    final_roll_set.remove(roll)
        
        # 2. Add Applied students (always eligible once they applied)
        if drive.id:
            applied_rolls = list(PlacementApplication.objects.filter(drive=drive).values_list('student__roll_number', flat=True))
            final_roll_set |= set(applied_rolls)
            print(f"[ENGINE] Applied rolls added: {len(applied_rolls)}")
                
        print(f"[ENGINE] Total Target Set size: {len(final_roll_set)}")
        return StudentAcademicRegistry.objects.filter(roll_number__in=final_roll_set).distinct()

    @staticmethod
    def get_manifest_preview_qs(drive: PlacementDrive):
        """
        Returns the full candidate pool for the UI Preview.
        In Exclusion Mode (default): shows everyone matching criteria.
        In Inclusion Mode: shows everyone matching criteria, but UI will handle checkboxes.
        """
        criteria_qs_ids = list(EligibilityEngine.get_eligible_students_qs(drive).values_list('roll_number', flat=True))
        manual_inclusions = drive.manual_students or []
        
        # We always show the FULL criteria pool in preview so the admin can pick from it.
        final_roll_set = set(criteria_qs_ids) | set(manual_inclusions)
        
        if drive.id:
            applied_rolls = list(PlacementApplication.objects.filter(drive=drive).values_list('student__roll_number', flat=True))
            final_roll_set |= set(applied_rolls)
            
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
    def broadcast_invitations(drive: PlacementDrive, mode='INITIAL'):
        """
        Triggers the asynchronous recruitment broadcast.
        Auto-detects if Celery worker is available, falls back to thread if not.
        'mode' can be 'INITIAL', 'REMINDER', 'MISSING'.
        """
        from apps.placement.tasks import broadcast_placement_drive_task
        from django.db import connection
        
        schema_name = connection.schema_name
        task_id = None
        
        # Check if Celery worker is actually alive
        celery_alive = False
        try:
            from auip_core.celery import app as celery_app
            inspector = celery_app.control.inspect(timeout=3.0)
            pong = inspector.ping()
            celery_alive = bool(pong)
            print(f"[BROADCAST] Celery ping result: {pong}", flush=True)
        except Exception as e:
            print(f"[BROADCAST] Celery ping failed: {e}", flush=True)
            celery_alive = False
        
        if celery_alive:
            try:
                task = broadcast_placement_drive_task.delay(drive.id, schema_name, mode=mode)
                task_id = task.id
                logger.info(f"[BROADCAST] Celery task dispatched: {task_id} (mode={mode})")
            except Exception as e:
                logger.warning(f"[BROADCAST] Celery dispatch failed: {e}")
                celery_alive = False
        
        if not celery_alive:
            import threading
            import uuid
            task_id = str(uuid.uuid4())
            logger.info(f"[BROADCAST] No Celery worker. Running in thread. ID={task_id} (mode={mode})")
            print(f"[BROADCAST] No Celery worker. Running in thread. ID={task_id}", flush=True)
            
            def _run_in_thread():
                """Run the broadcast task directly (not via Celery .apply())."""
                try:
                    print(f"[BROADCAST-THREAD] Starting for drive {drive.id}, schema={schema_name}, mode={mode}", flush=True)
                    # Import and call the raw task function directly, bypassing Celery's bind=True wrapper
                    from apps.placement.tasks import broadcast_placement_drive_task
                    # .run() calls the underlying function directly, passing 'self' as None for unbound
                    broadcast_placement_drive_task.run(None, drive.id, schema_name, mode=mode)
                    print(f"[BROADCAST-THREAD] ✅ Completed for drive {drive.id}", flush=True)
                except Exception as exc:
                    import traceback
                    print(f"[BROADCAST-THREAD] ❌ ERROR: {exc}", flush=True)
                    traceback.print_exc()
                    logger.error(f"[BROADCAST-THREAD] Error: {exc}", exc_info=True)
            
            t = threading.Thread(target=_run_in_thread, daemon=True)
            t.start()
        
        # Mark drive as 'broadcasting' initial state
        drive.is_broadcasted = False 
        drive.save(update_fields=['is_broadcasted', 'updated_at'])
        
        # Create SocialPost Alert early
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
            logger.error(f"[SOCIAL-POST-ERR] Failed to create: {str(e)}")

        return {
            "success": True,
            "task_id": task_id,
            "message": "Broadcast orchestration started in the background."
        }
    
    @staticmethod
    def send_unified_placement_alert(drive: Any, registry: Any, is_active: bool, chat_link: str = "", smtp_connection=None):
        """
        Sends the premium HTML alert to ALL known emails for a student.
        Also triggers a database notification for active accounts.
        Uses persistent smtp_connection when provided for batch performance.
        """
        from apps.notifications.services import NotificationDispatcher
        from django.conf import settings
        from django.core.mail import send_mail, EmailMessage
        import smtplib
        
        is_debug = getattr(settings, 'DEBUG', False)
        
        emails = set()
        if registry.official_email: emails.add(registry.official_email)
        if registry.personal_email: emails.add(registry.personal_email)
        
        if not emails:
            if is_debug:
                logger.warning(f"[PLACEMENT-EMAIL-DEBUG] No emails found for {registry.roll_number} ({registry.full_name})")
            return False
            
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        
        # 1. Prepare Dynamic Content
        subject = (
            f"🎯 Recruitment Invite: {drive.company_name} | {drive.role}" if is_active 
            else f"🎯 Placement Eligibility: Match Found at {drive.company_name}"
        )
        
        html_content = EligibilityEngine._get_premium_placement_html(
            student_name=registry.full_name,
            company_name=drive.company_name,
            role=drive.role,
            package=drive.package_details or "To be announced",
            deadline=str(drive.deadline),
            frontend_url=frontend_url,
            is_active=is_active,
            chat_link=chat_link
        )
        
        # 2. Universal Delivery (To all emails)
        from django.utils.html import strip_tags
        text_content = strip_tags(html_content)
        
        if is_debug:
            logger.info(f"[PLACEMENT-EMAIL-DEBUG] Attempting to send to {emails} | "
                        f"SMTP: {getattr(settings, 'EMAIL_HOST', '?')}:{getattr(settings, 'EMAIL_PORT', '?')} | "
                        f"Backend: {getattr(settings, 'EMAIL_BACKEND', '?')} | "
                        f"From: {getattr(settings, 'DEFAULT_FROM_EMAIL', '?')}")
        
        email_sent = False
        for email in emails:
            try:
                if smtp_connection:
                    # Use persistent connection for batch performance
                    msg = EmailMessage(
                        subject=subject,
                        body=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[email],
                        connection=smtp_connection,
                    )
                    msg.content_subtype = 'html'
                    msg.body = html_content
                    msg.send(fail_silently=False)
                else:
                    send_mail(
                        subject=subject,
                        message=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        html_message=html_content,
                        fail_silently=False,
                    )
                email_sent = True
                if is_debug:
                    logger.info(f"[PLACEMENT-EMAIL-DEBUG] ✅ Sent to {email}")
            except smtplib.SMTPDataError as e:
                # Gmail quota exceeded (code 550 or similar), rate limits etc
                logger.error(f"[PLACEMENT-EMAIL-SMTP] SMTP data error for {email}: code={e.smtp_code} msg={e.smtp_error}")
                if is_debug:
                    logger.error(f"[PLACEMENT-EMAIL-DEBUG] This may be a Gmail daily limit (500 emails/day). "
                                 f"Consider using a transactional email service (SES, Sendgrid) for production.")
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"[PLACEMENT-EMAIL-SMTP] Authentication failed: {e.smtp_code} {e.smtp_error}")
                if is_debug:
                    logger.error(f"[PLACEMENT-EMAIL-DEBUG] Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in settings.")
            except smtplib.SMTPRecipientsRefused as e:
                logger.error(f"[PLACEMENT-EMAIL-SMTP] Recipient refused for {email}: {e.recipients}")
            except smtplib.SMTPException as e:
                logger.error(f"[PLACEMENT-EMAIL-SMTP] SMTP error for {email}: {type(e).__name__}: {str(e)}")
            except Exception as e:
                logger.error(f"[PLACEMENT-EMAIL-ERR] Unexpected error for {email}: {type(e).__name__}: {str(e)}", exc_info=is_debug)

        # 3. In-App Notification (For Active Students)
        if is_active:
            try:
                from apps.notifications.models import Notification
                from apps.identity.models import User as GlobalUser
                from django_tenants.utils import schema_context
                
                recipient_id = None
                with schema_context('public'):
                    global_user = GlobalUser.objects.filter(email=registry.official_email).first()
                    if global_user:
                        recipient_id = global_user.id
                
                if recipient_id:
                    Notification.objects.get_or_create(
                        recipient_id=recipient_id,
                        title=f"🎯 New Opportunity: {drive.company_name}",
                        notification_type='PLACEMENT',
                        defaults={
                            "message": f"You have been invited to apply for {drive.role} at {drive.company_name}. Complete your application before the deadline.",
                            "link_url": "/placement-hub"
                        }
                    )
                    if is_debug:
                        logger.info(f"[PLACEMENT-NOTIF-DEBUG] ✅ In-app notification created for user {recipient_id}")
                elif is_debug:
                    logger.warning(f"[PLACEMENT-NOTIF-DEBUG] No global user found for {registry.official_email}")
            except Exception as e:
                logger.error(f"[PLACEMENT-NOTIF-ERR] Failed for {registry.roll_number}: {str(e)}")
                
        return email_sent

    @staticmethod
    def _get_premium_placement_html(student_name, company_name, role, package, deadline, frontend_url, is_active, chat_link=None):
        """Standard high-fidelity branding for all placement communications."""
        status_label = "INVITED" if is_active else "ELIGIBLE"
        status_color = "#6366f1" if is_active else "#f59e0b"
        cta_text = "APPLY IN PLACEMENT HUB" if is_active else "ACTIVATE ACCOUNT"
        cta_link = f"{frontend_url}/placement-hub" if is_active else f"{frontend_url}/activate-request"
        
        header_msg = (
            "Our Recruitment Core has matched your profile as a top candidate. You are <strong>INVITED</strong> to apply for the following venture:"
            if is_active else
            "Our Neural Core has identified a new placement match for your profile. You are <strong>ELIGIBLE</strong> for the following opportunity:"
        )

        chat_snippet = ""
        if chat_link and is_active:
             chat_snippet = f"""
             <div style="margin-top: 15px; text-align: center;">
                 <a href="{chat_link}" style="color: #6366f1; font-size: 13px; font-weight: 700; text-decoration: none; border-bottom: 2px solid rgba(99, 102, 241, 0.2); padding-bottom: 2px;">
                     💬 Join Recruitment Discussion Hub
                 </a>
             </div>
             """

        activation_snippet = "" if is_active else f"""
            <div style="margin-top: 20px; padding: 15px; background: rgba(245, 158, 11, 0.05); border: 1px dashed rgba(245, 158, 11, 0.2); border-radius: 12px; text-align: center;">
                <p style="color: #f59e0b; font-size: 13px; margin: 0; font-weight: 600;">
                    Your account is currently INACTIVE.
                </p>
                <p style="color: #94a3b8; font-size: 11px; margin: 5px 0 0 0;">
                    Activate now to gain full access to the AI Placement Hub, view detailed JD, and track your interview rounds.
                </p>
            </div>
        """

        return f"""
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #0a0b10; color: #ffffff; padding: 40px; border-radius: 20px; max-width: 600px; margin: 20px auto; border: 1px solid rgba(255,255,255,0.05);">
            <header style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 24px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px; margin-bottom: 5px;">AUIP</div>
                <div style="color: #94a3b8; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800;">Secure Placement Intelligence</div>
            </header>
            
            <main style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 35px; border-radius: 28px;">
                <h2 style="margin-top: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Hello {student_name},</h2>
                <p style="font-size: 16px; color: #cbd5e1; line-height: 1.6; margin-bottom: 25px;">
                    {header_msg}
                </p>
                
                <div style="background: rgba(99, 102, 241, 0.05); border-left: 4px solid {status_color}; padding: 25px; border-radius: 0 16px 16px 0; margin-bottom: 25px;">
                    <div style="margin-bottom: 15px;">
                        <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 1px;">Corporation</span>
                        <span style="color: #ffffff; font-weight: 700; font-size: 20px; letter-spacing: -0.3px;">{company_name}</span>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 1px;">Role / Designation</span>
                        <span style="color: #6366f1; font-weight: 700; font-size: 18px;">{role}</span>
                    </div>
                    
                    <div style="display: flex; border-top: 1px solid rgba(99, 102, 241, 0.1); padding-top: 15px;">
                        <div style="flex: 1;">
                            <span style="color: #94a3b8; font-size: 10px; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 1px;">Status</span>
                            <span style="color: {status_color}; font-weight: 800; font-size: 16px;">{status_label}</span>
                        </div>
                        <div style="flex: 1;">
                            <span style="color: #10b981; font-size: 10px; text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px; letter-spacing: 1px;">Apply By</span>
                            <span style="color: #f43f5e; font-weight: 800; font-size: 16px;">{deadline}</span>
                        </div>
                    </div>
                </div>

                {activation_snippet}
                
                <div style="margin-top: 40px; text-align: center;">
                    <a href="{cta_link}" style="background: #6366f1; color: #ffffff; padding: 18px 45px; border-radius: 18px; text-decoration: none; font-weight: 900; letter-spacing: 0.5px; display: inline-block; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);">
                        {cta_text} →
                    </a>
                </div>
                {chat_snippet}
            </main>
            
            <footer style="text-align: center; color: #475569; font-size: 10px; margin-top: 40px; line-height: 1.6;">
                &copy; 2026 AUIP Professional Hub. All rights reserved. <br/>
                This invitation was dynamically generated by the AUIP Placement Intelligence Engine.<br/>
                <span style="color: #334155;">Institutional Identity Verification: SECURED</span>
            </footer>
        </div>
        """

    @staticmethod
    def _send_inactive_student_email(email: str, student_name: str, company_name: str, role: str, package: str, deadline: str, frontend_url: str):
        """DEPRECATED: Legacy shim."""
        from django.core.mail import send_mail
        from django.conf import settings
        from django.utils.html import strip_tags
        
        subject = f"🎯 Important: Placement Eligibility at {company_name}"
        html = EligibilityEngine._get_premium_placement_html(student_name, company_name, role, package, deadline, frontend_url, False)
        
        send_mail(
            subject=subject,
            message=strip_tags(html),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html,
            fail_silently=False
        )
    
    @staticmethod
    def provision_recruitment_hub(drive: PlacementDrive):
        """
        Point 4: Auto-creates a ChatSession group for this placement drive.
        All students in the academic registry (the 'drive-1X' group) are auto-added 
        to ensure they see the announcement immediately upon login.
        """
        from apps.social.models import ChatSession
        from apps.auip_institution.models import FacultyAuthorizedAccount, StudentAcademicRegistry
        from django.conf import settings
        import uuid
        
        # Check if group already exists
        existing = ChatSession.objects.filter(
            participants_metadata__drive_id=drive.id
        ).first()
        
        if existing:
             return {
                "session_id": str(existing.session_id),
                "invite_link": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?group={existing.session_id}",
                "already_existed": True,
            }
        
        # Initialize with empty students, they will be auto-joined when they access the link if eligible/applied
        participants = []
        
        # Add all active faculty, admins, and inst admins
        # This ensures they are auto-members of all recruitment hubs
        for faculty in FacultyAuthorizedAccount.objects.filter(is_active=True).select_related('academic_ref'):
            # Use academic_ref_id if available, otherwise fallback to account id
            # Both are integers (or can be treated as such)
            participant_id = faculty.academic_ref_id if faculty.academic_ref_id else faculty.id
            faculty_name = getattr(faculty, 'full_name', getattr(faculty, 'email', f'Faculty-{faculty.id}'))
            participants.append({
                "id": int(participant_id),
                "role": "FACULTY",
                "name": faculty_name,
            })
        
        from apps.auip_institution.models import AdminAuthorizedAccount
        for admin in AdminAuthorizedAccount.objects.all():
            participants.append({
                "id": int(admin.id),
                "role": admin.role, # INST_ADMIN or ADMIN
                "name": admin.full_name,
            })
        
        uid_hex = uuid.uuid4().hex
        invite_token = uid_hex[:16]
        
        group = ChatSession.objects.create(
            is_group=True,
            name=f"[Drive-{drive.id}] {drive.company_name} — Announcement Hub",
            participants=participants,
            participants_metadata={
                "drive_id": drive.id,
                "company": drive.company_name,
                "role": drive.role,
                "created_by": "SYSTEM",
                "auto_generated": True,
                "read_only_for_students": True, # Announcements only
            },
            invite_link_token=invite_token,
        )
        
        return {
            "session_id": str(group.session_id),
            "invite_token": invite_token,
            "invite_link": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/chat-hub?group={group.session_id}"
        }

    @staticmethod
    def _create_drive_group(drive: PlacementDrive, eligible_qs):
        """Legacy alias for backward compatibility or mode-specific creation."""
        return EligibilityEngine.provision_recruitment_hub(drive)

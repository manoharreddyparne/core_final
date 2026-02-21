import json
import google.generativeai as genai
from django.conf import settings
from django.utils import timezone
from apps.governance.models import StudentBehaviorLog, StudentIntelligenceProfile, GovernancePolicy
from apps.intelligence.models import LLMContext, ATSAnalysis, LLMInteraction
from apps.auip_institution.models import StudentAcademicRegistry
from apps.placement.models import PlacementDrive
import logging

logger = logging.getLogger(__name__)

class BrainOrchestrator:
    """
    The central intelligence service that coordinates between 
    Governance (Policies) and Intelligence (ML/LLM).
    Uses Gemini (Free Tier) with RAG.
    """

    @staticmethod
    def _get_gemini_client():
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key or api_key == 'your_gemini_api_key_here':
            return None
        genai.configure(api_key=api_key)
        return genai.GenerativeModel('gemini-pro')

    @staticmethod
    def rebuild_student_matrix(student_id):
        """
        Processes behavior logs to update the Student's Content Matrix (Interests/Skills).
        This is the 'Model Training' part for personalization.
        """
        student = StudentAcademicRegistry.objects.get(id=student_id)
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        logs = StudentBehaviorLog.objects.filter(student=student).order_by('-timestamp')[:50]
        
        # 1. Update Behavior Score (e.g. 1 point per distinct active day)
        active_days = StudentBehaviorLog.objects.filter(student=student).values('timestamp__date').distinct().count()
        profile.behavior_score = min(100, active_days * 5) # Cap at 100

        # 2. Update Interest Matrix (Content-based tracking)
        # We look at what categories they interact with most
        new_matrix = {}
        for log in logs:
            category = log.target_type or 'general'
            new_matrix[category] = new_matrix.get(category, 0) + 1
        
        profile.interest_matrix = new_matrix

        # 3. Apply Governance Policies
        # This determines which features they can access
        from django.db.models import Q
        active_policies = GovernancePolicy.objects.filter(is_active=True).order_by('priority')
        new_controls = {}
        
        for policy in active_policies:
            # Simple condition matching logic
            met = True
            for key, min_val in policy.conditions.items():
                current_val = getattr(profile, key, 0)
                if current_val < min_val:
                    met = False
                    break
            
            if met:
                new_controls.update(policy.actions)
            else:
                # If a policy is not met, we might explicitly disable features
                # and provide a reason
                for action_key in policy.actions.keys():
                    if action_key not in new_controls:
                        new_controls[action_key] = False
                        new_controls[f"{action_key}_reason"] = f"Requirement not met: {policy.name}"

        profile.active_controls = new_controls
        profile.save()
        
        return profile

    @staticmethod
    def get_llm_guidance(student_id, query, context_type='CAREER'):
        """
        Generates personalized guidance using RAG and Profile Matrix.
        """
        student = StudentAcademicRegistry.objects.get(id=student_id)
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # 🛡️ RAG Phase: Gather Student-Specific Context
        # 1. Experience/Projects Context
        rag_data = list(LLMContext.objects.filter(student=student).values_list('content_chunk', flat=True))
        
        # 2. Behavior Context (Atomic operations summary)
        recent_activity = list(StudentBehaviorLog.objects.filter(student=student).order_by('-timestamp')[:10].values_list('event_type', 'target_type'))
        activity_summary = ", ".join([f"{evt} on {tgt}" for evt, tgt in recent_activity])

        # 🚀 LLM Phase: Orchestrate Prompt
        system_prompt = f"""
        YOU ARE: The AUIP Governance Brain, an expert university mentor.
        STUDENT PROFILE:
        - Roll Number: {student.roll_number}
        - Major: {student.department}
        - CGPA: {getattr(student, 'cgpa', 'N/A')}
        - Readiness Score: {profile.readiness_score}/100
        - Behavior Score: {profile.behavior_score}/100
        - Core Interests: {profile.interest_matrix}
        
        PERSONAL CONTEXT (RAG):
        {chr(10).join(rag_data[:5])}
        
        RECENT ACTIVITY:
        Student was recently active in: {activity_summary}

        TASK:
        Provide hyper-personalized career/project guidance. 
        If they ask for JD matching, use their "Core Interests" as current skill proxies.
        Maintain a professional, supportive, and data-driven tone.
        """
        
        client = BrainOrchestrator._get_gemini_client()
        if not client:
            return f"[DEMO] Gemini API Key not found. Mock guidance for: {query}"

        try:
            response = client.generate_content(f"{system_prompt}\n\nUSER QUERY: {query}")
            ai_text = response.text
            
            # Persist Interaction
            LLMInteraction.objects.create(
                student=student,
                prompt=query,
                response=ai_text,
                using_rag=True
            )
            return ai_text
        except Exception as e:
            logger.error(f"[BRAIN-API-ERROR] LLM call failed: {e}")
            return f"I'm sorry, I'm currently processing a lot of data. However, based on your profile, I suggest focusing on your {student.department} projects."

class ATSService:
    """
    Automated Tracking System service for Resume vs JD matching.
    Uses Gemini for deep semantic analysis.
    """
    @staticmethod
    def analyze_resume_fit(student_id, drive_id):
        student = StudentAcademicRegistry.objects.get(id=student_id)
        drive = PlacementDrive.objects.get(id=drive_id)
        profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # Gather Student Details
        student_context = f"""
        Branch: {student.department}
        Skills Matrix: {profile.skill_matrix}
        Interests: {profile.interest_matrix}
        """
        
        # Gather JD
        jd_text = drive.job_description or "Trainee Engineer Role"
        
        client = BrainOrchestrator._get_gemini_client()
        if not client:
            return ATSAnalysis.objects.create(
                student=student, drive=drive, fit_score=50, 
                suggested_improvements="API Key missing for AI analysis."
            )

        prompt = f"""
        Compare the following Student Profile with the Job Description (JD).
        STUDENT: {student_context}
        JD: {jd_text}
        
        Provide a JSON response with:
        - "fit_score": (0-100)
        - "missing_keywords": [list]
        - "technical_weaknesses": [list]
        - "communication_weaknesses": [list]
        - "advice": "Brief textual advice"
        """

        try:
            response = client.generate_content(prompt)
            # Find JSON in response
            import re
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                res = json.loads(json_match.group())
                analysis = ATSAnalysis.objects.create(
                    student=student,
                    drive=drive,
                    fit_score=res.get('fit_score', 0),
                    missing_keywords=res.get('missing_keywords', []),
                    technical_weaknesses=res.get('technical_weaknesses', []),
                    communication_weaknesses=res.get('communication_weaknesses', []),
                    suggested_improvements=res.get('advice', ""),
                    raw_jd_copy=jd_text
                )
                return analysis
        except Exception as e:
            logger.error(f"ATS AI error: {e}")
            
        return ATSAnalysis.objects.create(student=student, drive=drive, fit_score=0)

class SelfHealingSupportService:
    """
    Service to handle automated issue resolution using Gemini.
    """
    @staticmethod
    def auto_diagnose(ticket_id):
        from apps.social.models import SupportTicket
        ticket = SupportTicket.objects.get(id=ticket_id)
        ticket.status = 'AI_SCANNING'
        ticket.save()

        client = BrainOrchestrator._get_gemini_client()
        if not client:
            ticket.ai_diagnosis = "AI Engine offline. Technical support notified."
            ticket.status = 'OPEN'
            ticket.save()
            return

        prompt = f"""
        Student Problem Description: {ticket.description}
        Subject: {ticket.subject}
        
        Analyze if this is a common portal issue (Login, Token, Profile, Academic Records).
        If you can provide a self-help solution or if the system can "fix" it (like resetting a session).
        Return:
        - "diagnosis": "Detailed diagnosis"
        - "suggested_action": "Action to solve"
        - "can_auto_fix": true/false
        """

        try:
            response = client.generate_content(prompt)
            # Parse response... (Simplified for now)
            ticket.ai_diagnosis = response.text
            if "fix" in response.text.lower():
                ticket.automated_fix_applied = True
                ticket.status = 'RESOLVED'
            else:
                ticket.status = 'OPEN'
            ticket.save()
        except:
            ticket.status = 'OPEN'
            ticket.save()

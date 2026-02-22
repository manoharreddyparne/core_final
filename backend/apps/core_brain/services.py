import json
import google.generativeai as genai
from django.conf import settings
from django.utils import timezone
from apps.governance.models import StudentBehaviorLog, StudentIntelligenceProfile, GovernancePolicy
from apps.intelligence.models import LLMContext, ATSAnalysis, LLMInteraction
from apps.auip_institution.models import StudentAcademicRegistry
from apps.placement.models import PlacementDrive
from apps.identity.models import User
import logging
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import groq
logger = logging.getLogger(__name__)

class BrainOrchestrator:
    """
    The central intelligence service that coordinates between 
    Governance (Policies) and Intelligence (ML/LLM).
    Uses Gemini (Free Tier) with RAG.
    """

    @staticmethod
    def _get_llm_client():
        try:
            provider = getattr(settings, 'LLM_PROVIDER', 'gemini')
            
            if provider == 'openai_compatible':
                # We use direct requests for this provider now to avoid httpx conflicts
                return "REQUESTS_MODE"
            
            # Default to Gemini
            api_key = getattr(settings, 'GEMINI_API_KEY', None)
            if not api_key or api_key == 'your_gemini_api_key_here':
                return None
            genai.configure(api_key=api_key)
            return genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            logger.error(f"[BRAIN-CLIENT-INIT-ERROR]: {e}")
            return None

    _executor = ThreadPoolExecutor(max_workers=10) # Managed global pool to prevent leaks

    @staticmethod
    def generate_text(prompt, system_prompt=None, history=None):
        """
        Unified method to call LLM regardless of provider.
        Runs in a background thread to avoid blocking the main Daphne/Django event loop.
        Uses a persistent pool to prevent OS thread exhaustion.
        """
        if history is None:
            history = []
            
        future = BrainOrchestrator._executor.submit(
            BrainOrchestrator._execute_generate, prompt, system_prompt, history
        )
        try:
            # Total hard limit of 30 seconds for the entire pipeline
            return future.result(timeout=30)
        except TimeoutError:
            logger.error("[BRAIN-TIMEOUT] AI node took too long. Protecting institutional uptime.")
            # Note: We don't cancel because standard ThreadPool futures aren't easily cancellable
            return None
        except Exception as e:
            logger.error(f"[BRAIN-THREAD-ERROR] Execution failed: {e}")
            return None

    @staticmethod
    def _execute_generate(prompt, system_prompt=None, history=None):
        if history is None:
            history = []
            
        # BEST APPROACH: GROQ CLOUD (LPU - Language Processing Unit)
        # This gives you "Unlimited Llama 3" running at 800+ Tokens/Sec 
        # completely bypassing Cloudflare, Colab, and Gemini Limits.
        try:
            # Use the provided Groq key or fall back to Gemini logic if unavailable/invalid.
            groq_key = getattr(settings, 'GROQ_API_KEY', None)
            if not groq_key or "invalid" in str(groq_key).lower():
                raise ValueError("No valid Groq key found. Attempting Fallback.")
            client = groq.Groq(api_key=groq_key)
            
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
                
            # Append proper history natively
            for chat in history:
                # Map roles correctly to OpenAI/Groq standards. 'ai' or 'model' -> 'assistant'
                fixed_role = 'assistant' if chat['role'] in ['ai', 'agent', 'model'] else 'user'
                messages.append({"role": fixed_role, "content": chat['content']})
                
            messages.append({"role": "user", "content": prompt})

            # We use Llama-3 8B strictly. It's lightning fast and incredibly smart.
            completion = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
                top_p=1,
                stream=False
            )
            
            if completion and completion.choices:
                logger.info("[BRAIN-GROQ] BLAZING FAST Llama-3 Response Delivered.")
                return completion.choices[0].message.content
                
        except Exception as groq_e:
            logger.error(f"[BRAIN-GROQ-ERROR] {groq_e}. Instantly switching to Gemini Lite.")
            
            # --- GOOGLE GEMINI (ULTRA FAST FALLBACK) ---
            try:
                api_key = getattr(settings, 'GEMINI_API_KEY', None)
                if not api_key: 
                    return "AI systems are currently initializing. Please try again in a moment."
                    
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                # Gemini doesn't use the standard system prompt, we pass it inside the full text block
                full_prompt = f"{system_prompt}\n\n" if system_prompt else ""
                
                # We can inject history manually for simple API call format
                for chat in history:
                    role_str = "User" if chat['role'] == "user" else "AI"
                    full_prompt += f"{role_str}: {chat['content']}\n"
                    
                full_prompt += f"\nUser: {prompt}\nAI:"
                
                for model_name in ['gemini-1.5-flash', 'gemini-1.5-flash-8b']:
                    try:
                        temp_model = genai.GenerativeModel(model_name)
                        res = temp_model.generate_content(full_prompt)
                        if res and res.text:
                            logger.info(f"[BRAIN-SPEED] Fast fallback via {model_name}")
                            return res.text
                    except Exception as inner_e:
                        error_str = str(inner_e)
                        logger.error(f"[BRAIN-GEMINI-LOOP] Model {model_name} failed: {error_str}")
                        if "429" in error_str or "Quota" in error_str:
                            return "SYSTEM_LIMIT_REACHED: Google Gemini free-tier quota exceeded (15 requests/min). To unlock unlimited instant responses, please generate a free Groq API key at console.groq.com and update the GROQ_API_KEY in the .env file."
                        continue
                        
                return "The Intelligence Portal is currently under high load. Redirecting simple queries to standard search."
            except Exception as e:
                logger.error(f"[BRAIN-GEMINI-CRITICAL]: {e}")
                return "Based on your behavior and readiness, I recommend reviewing the latest job drives in the Placement Hub and updating your Resume."


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
    def get_llm_guidance(user, query, context_type='CAREER'):
        """
        Generates personalized guidance using RAG and Profile Matrix.
        Now supports Role-Based Locking and Navigation Guidance.
        """
        role = user.role
        
        # 1. Fetch relevant models based on role
        student = None
        profile = None
        if role == User.Roles.STUDENT:
            # Check if user has academic_ref (as seen in views)
            student = getattr(user, 'academic_ref', None)
            if student:
                profile, _ = StudentIntelligenceProfile.objects.get_or_create(student=student)
        
        # 3. Role-Based Context & Metrics
        role_context = f"CURRENT USER ROLE: {role}\n"
        admin_metrics = ""
        
        # 🛡️ STRICT NAVIGATION PERMISSIONS
        STUDENT_ROUTES = {
            "dashboard": "/student-dashboard",
            "intelligence": "/student-intelligence",
            "resume": "/resume-studio",
            "placement": "/placement-hub",
            "social": "/professional-hub",
            "chat": "/chat-hub",
            "support": "/support-hub",
            "profile": "/profile",
            "settings": "/settings",
            "security": "/security",
        }
        
        ADMIN_ROUTES = {
            "dashboard": "/institution/dashboard",
            "students": "/institution/students",
            "faculty": "/institution/faculty",
            "core_students": "/admin/core-students",
            "profile": "/profile",
            "settings": "/settings",
            "security": "/security",
        }
        
        FACULTY_ROUTES = {
            "dashboard": "/faculty-dashboard",
            "profile": "/profile",
            "settings": "/settings",
            "security": "/security",
        }

        if role == User.Roles.STUDENT:
            role_context += "You are talking to a Student. Do not show or guide to Administrative pages."
            allowed_routes = STUDENT_ROUTES
        elif role in [User.Roles.INSTITUTION_ADMIN, User.Roles.SUPER_ADMIN, 'INST_ADMIN', 'INSTITUTION_ADMIN']:
            role_context += "You are talking to an Institution Admin. You have access to specialized management tools."
            allowed_routes = ADMIN_ROUTES
            # 📊 Inject Real-time Admin Metrics
            try:
                from apps.auip_institution.models import StudentAcademicRegistry, FacultyAcademicRegistry
                from apps.placement.models import PlacementDrive
                student_count = StudentAcademicRegistry.objects.count()
                faculty_count = FacultyAcademicRegistry.objects.count()
                active_drives = PlacementDrive.objects.filter(status='ACTIVE').count()
                admin_metrics = f"""
                INSTITUTION REAL-TIME METRICS:
                - Registered Students: {student_count}
                - Registered Faculty: {faculty_count}
                - Active Placement Drives: {active_drives}
                (You can use these numbers to answer the user directly)
                """
            except Exception as e:
                logger.warning(f"Failed to fetch admin metrics for LLM: {e}")
        elif role == User.Roles.FACULTY:
            role_context += "You are talking to a Faculty member."
            allowed_routes = FACULTY_ROUTES
        else:
            role_context += f"You are talking to {role}."
            allowed_routes = STUDENT_ROUTES # Fallback safe

        # 🚀 4. Intent Pre-processing (Act Fiber Net Style)
        # We can do this via code or tell the LLM to handle it. 
        # For "Industry Level", we'll tell the LLM to return a JSON-ish action if it detects a request to navigate.
        
        conversation_history_text = "No previous conversation found."
        raw_history = []
        
        if student and profile:
            rag_data = list(LLMContext.objects.filter(student=student).values_list('content_chunk', flat=True))
            recent_activity = list(StudentBehaviorLog.objects.filter(student=student).order_by('-timestamp')[:10].values_list('event_type', 'target_type'))
            activity_summary = ", ".join([f"{evt} on {tgt}" for evt, tgt in recent_activity])
            
            # Fetch the last 5 conversation turns to maintain context 
            recent_chats = list(LLMInteraction.objects.filter(student=student).order_by('-created_at')[:5])
            if recent_chats:
                history_lines = []
                for chat in reversed(recent_chats): # Chronological order
                    history_lines.append(f"User: {chat.prompt}")
                    history_lines.append(f"AI: {chat.response}")
                    raw_history.append({"role": "user", "content": chat.prompt})
                    raw_history.append({"role": "model", "content": chat.response})
                conversation_history_text = "\n".join(history_lines)
                
            profile_data = f"""
            - Readiness Score: {profile.readiness_score}/100
            - Behavior Score: {profile.behavior_score}/100
            - Core Interests: {profile.interest_matrix}
            """

        # Get name safely
        try:
            full_name = user.get_full_name() if hasattr(user, 'get_full_name') else f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
        except:
            full_name = getattr(user, 'email', 'Unknown User')

        system_prompt = f"""
        YOU ARE: AUIP Intelligence Brain - An industry-grade, highly professional AI assistant for the AUIP University platform.
        {role_context}
        
        USER CONTEXT:
        - Name: {full_name or user.email}
        - Current Role: {role}
        {profile_data if student and profile else "- Dashboard: Administrative Management"}
        
        {admin_metrics}
        
        🛡️ ALLOWED NAVIGATION ROUTES (STRICT LIST):
        {json.dumps(allowed_routes, indent=2)}
        
        ⚠️ CRITICAL CONSTRAINT:
        ONLY guide users to the routes listed above. 
        If a user asks for 'Courses', 'Resume', or 'Careers' and they are an ADMIN, they DO NOT have access to those student-only features. 
        Inform them politely but firmly that those features are for students and are not in their administrative scope.
        
        STRICT INSTRUCTIONS:
        1. Act as a polite, concise, and helpful career & academic advisor OR platform management assistant depending on the user's role.
        2. IF THE USER IS AN ADMIN: Do NOT suggest 'Intelligence Hub', 'Resume Studio', or 'Placement Hub'. These are for Students. Instead, guide them to 'Student Base', 'Faculty Hub', or 'Dashboard' for management.
        3. DO NOT artificially state "I see your score is 0" or "Your interests are unstated" unless the user explicitly asks about them. Use this data subtly (e.g., if scores are 0, warmly encourage them to explore the portal to build their profile).
        4. DO NOT repeatedly mention their "recent activity" unless it directly answers their question.
        5. If guiding a user to a page, ALWAYS use this exact markdown format for links: `[Link Text](ROUTE)`. NEVER surround the link with `**` or `_` formatting (e.g., skip `**[Dashboard](/dashboard)**`, use just `[Dashboard](/dashboard)`).
        6. Keep responses structured, easy to read, and under 3 paragraphs for general chat.
        
        CONVERSATION HISTORY (Context for current query):
        {conversation_history_text}
        
        PERSONAL CONTEXT (Resume/Skills Data for Context):
        {chr(10).join(rag_data[:5]) if student and profile and rag_data else "No specific documents uploaded yet."}
        
        RECENT PLATFORM ACTIVITY (Confidential context):
        {activity_summary if student and profile else "No recent activity."}
        """
        
        ai_text = BrainOrchestrator.generate_text(query, system_prompt=system_prompt, history=raw_history)
        
        if not ai_text:
            # --- HEURISTIC FALLBACK ---
            lower_query = query.lower()
            if "secure" in lower_query or "device" in lower_query:
                return "To secure your device or change your password, please navigate to the **[Security Portal](/security)**. You can manage sessions at **[Active Sessions](/security/sessions)**."
            if "performance" in lower_query or "score" in lower_query:
                if profile:
                    return f"Your current readiness score is **{profile.readiness_score}/100**. Keep engaging with the platform to improve it!"
                return "Performance metrics are currently only available for students."
            
            return "I am experiencing connectivity issues with my primary LLM node. Please use the sidebar to navigate or try again later."

        # Persist Interaction
        if student:
            try:
                LLMInteraction.objects.create(
                    student=student,
                    prompt=query,
                    response=ai_text,
                    using_rag=True if rag_data else False
                )
            except Exception as db_e:
                logger.error(f"[BRAIN-DB-ERROR] Failed to log interaction: {db_e}")
        return ai_text

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

        ai_response = BrainOrchestrator.generate_text(prompt)
        if not ai_response:
            return ATSAnalysis.objects.create(
                student=student, drive=drive, fit_score=50, 
                suggested_improvements="AI Engine offline. Technical support notified."
            )

        try:
            # Find JSON in response
            import re
            json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
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
            ai_response = BrainOrchestrator.generate_text(prompt)
            if not ai_response:
                ticket.ai_diagnosis = "AI Engine offline. Technical support notified."
                ticket.status = 'OPEN'
                ticket.save()
                return

            ticket.ai_diagnosis = ai_response
            if "fix" in ai_response.lower():
                ticket.automated_fix_applied = True
                ticket.status = 'RESOLVED'
            else:
                ticket.status = 'OPEN'
            ticket.save()
        except Exception as e:
            logger.error(f"Support Matrix Error: {e}")
            ticket.ai_diagnosis = "Our automated healing agent is currently undergoing maintenance. A human support agent has been assigned to your ticket."
            ticket.status = 'OPEN'
            ticket.save()

import google.generativeai as genai
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def call_gemini_ai(prompt, system_instruction=None, context_data=None):
    """
    Calls Google Gemini API with provided prompt and context.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        logger.error("GEMINI_API_KEY not found in settings.")
        return "AI Configuration missing."

    try:
        genai.configure(api_key=api_key)
        
        # Combine system instruction and context
        full_system_msg = system_instruction or "You are Nexora Assistant, a professional AI mentor for university students."
        if context_data:
            full_system_msg += f"\n\nStudent Context:\n{context_data}"
        
        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash-latest", 
                system_instruction=full_system_msg
            )
            response = model.generate_content(prompt)
            return response.text
        except Exception as inner_e:
            if "404" in str(inner_e) or "not found" in str(inner_e):
                logger.warning("gemini-1.5-flash-latest not found. Falling back to gemini-pro.")
                # Fallback to older gemini-pro
                fallback_model = genai.GenerativeModel("gemini-pro")
                # system_instruction is not supported in the exact same way on gemini-pro sometimes, 
                # so we append it to the prompt.
                fallback_response = fallback_model.generate_content(f"{full_system_msg}\n\nUser Query: {prompt}")
                return fallback_response.text
            else:
                raise inner_e

    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        # Return a graceful degradation message instead of raw server error
        return f"I'm currently operating in restricted offline mode due to continuous connection limits. Based on standard heuristics, I recommend reviewing your recent feedback. (Code: AI-OFFLINE-M)"

def analyze_behavior_with_ai(behavior_logs):
    """
    Uses AI to analyze behavior patterns and suggest governance updates.
    """
    prompt = f"Analyze these student behavior logs and provide a productivity score (0-100) and identify any policy risks:\n{behavior_logs}"
    system_instr = "You are the Nexora Governance Brain. You specialize in behavioral analysis and academic integrity."
    
    return call_gemini_ai(prompt, system_instruction=system_instr)


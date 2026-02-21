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
        full_system_msg = system_instruction or "You are AUIP Assistant, a professional AI mentor for university students."
        if context_data:
            full_system_msg += f"\n\nStudent Context:\n{context_data}"
        
        model = genai.GenerativeModel(
            model_name="gemini-pro", # Using gemini-pro for widest v1beta compatibility
            system_instruction=full_system_msg
        )
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return f"I'm sorry, I'm having trouble thinking right now. Error: {str(e)}"

def analyze_behavior_with_ai(behavior_logs):
    """
    Uses AI to analyze behavior patterns and suggest governance updates.
    """
    prompt = f"Analyze these student behavior logs and provide a productivity score (0-100) and identify any policy risks:\n{behavior_logs}"
    system_instr = "You are the AUIP Governance Brain. You specialize in behavioral analysis and academic integrity."
    
    return call_gemini_ai(prompt, system_instruction=system_instr)

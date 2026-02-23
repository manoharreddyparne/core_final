import json
import re
import logging
from typing import Dict, Any
from PyPDF2 import PdfReader
from apps.core_brain.services import BrainOrchestrator

logger = logging.getLogger(__name__)

class JDExtractionService:
    """
    AI-Powered service to extract strict placement eligibility criteria 
    from uploaded Job Description PDFs.
    """
    @staticmethod
    def extract_from_pdf(pdf_file) -> Dict[str, Any]:
        text = ""
        try:
            # Handle both in-memory uploaded files and on-disk files
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            logger.error(f"[JD-PARSE-ERROR] {e}")
            return {"error": f"Failed to read PDF: {str(e)}"}
            
        system_prompt = '''
You are an expert HR and Placement Criteria extraction engine for University Placements.
Analyze the provided Job Description (JD) text and extract the exact eligibility criteria in STRICT JSON format.

CRITICAL INSTRUCTIONS:
1. FIRST, determine if the provided text is actually a Job Description, Placement Drive, or Hiring Document. If the document is obviously fake, irrelevant (e.g., a random story, unrelated invoice, or blank), set "is_valid": false and leave the other fields blank/null.
2. If it is a valid JD, extract the criteria. If a specific criteria is not explicitly mentioned, use 0 for numbers, or an empty list/string.
3. For package details, keep it brief (e.g., "12 LPA"). Use the exact currency and numbers found.
4. IMPORTANT: DO NOT hallucinate company names or roles. If the text says "Apex Technologies", the company name MUST be "Apex Technologies". DO NOT use "google" or generic placeholders unless they are in the text.
5. Output ONLY valid JSON. Make sure you don't include ANY markdown backticks like ```json.
Your response must start with { and end with }.

JSON Structure required:
{
  "is_valid": true,
  "role": "Job Role Name",
  "min_cgpa": 0.0,
  "min_10th_percent": 0.0,
  "min_12th_percent": 0.0,
  "allowed_active_backlogs": 0,
  "eligible_branches": ["CSE", "IT", "ECE"],
  "eligible_batches": [2024, 2025],
  "package_details": "string",
  "other_requirements": "string summary of skills or anything else"
}
'''
        prompt = f"Extract criteria from the following JD:\n\n{text[:10000]}" # Limiting text size for LLM context
        
        response_text = BrainOrchestrator.generate_text(prompt, system_prompt=system_prompt)
        
        if not response_text:
            return {"error": "AI Engine failed to return a response."}
            
        try:
            # Cleanup potential markdown
            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
                
            json_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if json_match:
                extracted_data = json.loads(json_match.group())
            else:
                extracted_data = json.loads(cleaned)
                
            if not extracted_data.get('is_valid', True):
                return {"error": "The uploaded document does not appear to be a valid Job Description or Placement Requirement."}
            
            return extracted_data
        except Exception as e:
            logger.error(f"[JD-JSON-PARSE-ERROR] {e} on text: {response_text}")
            return {"error": "Failed to parse AI response into JSON.", "raw_output": response_text}

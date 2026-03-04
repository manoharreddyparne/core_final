import json
import re
import logging
from typing import Dict, Any
from PyPDF2 import PdfReader
from apps.core_brain.services import BrainOrchestrator

logger = logging.getLogger(__name__)


class JDExtractionService:
    """
    Two-pass self-correcting AI extraction engine for placement JDs.

    Pass 1: Initial extraction with a standard schema.
    Pass 2: The AI analyses what it got, rewrites its own refined prompt,
            fills dynamic fields it discovers in the document, and produces
            a corrected final output.
    """

    @staticmethod
    def extract_from_pdf(pdf_file) -> Dict[str, Any]:
        text = ""
        try:
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            logger.error(f"[JD-PDF-ERROR] {e}")
            return {"error": f"Failed to read PDF: {str(e)}"}

        logger.info(f"[JD-PDF] Extracted {len(text)} characters from {len(reader.pages)} page(s).")
        return JDExtractionService.extract_from_text(text)

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any] | None:
        """Safely parse JSON from an AI response that may contain markdown fences."""
        try:
            cleaned = raw.strip()
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception as e:
            logger.error(f"[JD-JSON-PARSE] {e}")
        return None

    @staticmethod
    def extract_from_text(text: str) -> Dict[str, Any]:
        if not text or len(text.strip()) < 50:
            return {"error": "Intelligence Core requires at least 50 JD characters."}

        jd_text = text[:20000]

        # ──────────────────────────────────────────────────────────────────
        # PASS 1 — Standard extraction with known schema
        # ──────────────────────────────────────────────────────────────────
        pass1_system = """
You are an expert HR Intelligence Engine for Tier-1 University Placements.
Analyse the provided JD text and produce a FIRST-PASS JSON extraction.

STRICT RULES:
- company_name: Look in headers, footers, letterheads, signatures, OR anywhere descriptive.
- CGPA vs Percentage: These are DIFFERENT. If JD says "60% in UG", set min_ug_percentage=60.0 and min_cgpa=0.0. If JD says "CGPA 7.5", set min_cgpa=7.5 and min_ug_percentage=0.0. NEVER convert one to the other automatically.
- location: MUST be a STRING. Multiple cities → "City A, City B".
- Do NOT hallucinate. If data is missing, use "Not Specified" for strings, 0.0 for numbers, [] for lists, {} for objects.
- dynamic_fields: Capture ANY requirement that doesn't fit standard fields. Examples: bond period, relocation requirement, shift timings, dress code, etc.

OUTPUT ONLY VALID JSON:
{
  "is_valid": true,
  "company_name": "",
  "role": "",
  "narrative_summary": "",
  "key_highlights": [],
  "min_cgpa": 0.0,
  "min_ug_percentage": 0.0,
  "min_10th_percent": 0.0,
  "min_12th_percent": 0.0,
  "allowed_active_backlogs": 0,
  "eligible_branches": [],
  "eligible_batches": [],
  "package_details": "Not Specified",
  "location": "Not Specified",
  "experience_years": "Not Specified",
  "qualifications": [],
  "salary_range": "Not Specified",
  "contact_details": [],
  "hiring_process": [],
  "primary_skills": [],
  "secondary_skills": [],
  "difficulty_level": 5,
  "drive_type": "GENERAL",
  "role_category": "GENERAL_ENG",
  "custom_criteria": {}
}
"""
        pass1_prompt = f"JD TEXT (ALL PAGES):\n\n{jd_text}"
        pass1_raw = BrainOrchestrator.generate_text(pass1_prompt, system_prompt=pass1_system)

        if not pass1_raw:
            return {"error": "AI Engine (Pass 1) failed to respond."}

        pass1_data = JDExtractionService._parse_json(pass1_raw)
        if not pass1_data:
            logger.error(f"[JD-PASS1-FAIL] Raw: {pass1_raw[:500]}")
            return {"error": "Pass 1 JSON parsing failed.", "raw": pass1_raw}

        if not pass1_data.get("is_valid", True):
            return {"error": "The AI identified this as an invalid/junk JD."}

        # ──────────────────────────────────────────────────────────────────
        # PASS 2 — Self-correction & dynamic field discovery
        # ──────────────────────────────────────────────────────────────────
        pass2_system = """
You are a SENIOR HR Intelligence Auditor performing a SECOND-PASS validation.

You are given:
1. The original JD text.
2. A first-pass extraction JSON.

Your job:
A) AUDIT the first-pass extraction for errors, omissions, and CGPA/% mix-ups.
B) DISCOVER any dynamic or unique requirements in the JD that were missed (bonds, shifts, travel, dress code, service agreements, inter/10th/12th details buried in body text, company URLs, unique benefits, etc.) and add them to custom_criteria as { "Field Name": "Value" }.
C) Improve narrative_summary to be a detailed, professional paragraph.
D) If company_name is missing or looks wrong, look harder in the JD text.
E) Output the FINAL corrected JSON — same schema as the first-pass output, but fully corrected.

CRITICAL:
- CGPA and % are DIFFERENT. 8 CGPA ≠ 80%. Do NOT auto-convert.
- location must be a STRING (not a list).
- Do NOT remove any field already extracted correctly.
- custom_criteria must be an object (key-value pairs), not a list.
"""

        pass2_prompt = (
            f"ORIGINAL JD TEXT:\n{jd_text}\n\n"
            f"FIRST-PASS EXTRACTION (audit and improve this):\n{json.dumps(pass1_data, indent=2)}"
        )

        pass2_raw = BrainOrchestrator.generate_text(pass2_prompt, system_prompt=pass2_system)

        if not pass2_raw:
            logger.warning("[JD-PASS2-FAIL] Pass 2 returned nothing. Falling back to Pass 1.")
            return pass1_data

        pass2_data = JDExtractionService._parse_json(pass2_raw)
        if not pass2_data:
            logger.warning(f"[JD-PASS2-JSON-FAIL] Falling back to Pass 1. Raw: {pass2_raw[:500]}")
            return pass1_data

        logger.info("[JD-EXTRACT] Two-pass extraction complete.")
        # Ensure location is always a string
        if isinstance(pass2_data.get("location"), list):
            pass2_data["location"] = ", ".join(pass2_data["location"])

        return pass2_data

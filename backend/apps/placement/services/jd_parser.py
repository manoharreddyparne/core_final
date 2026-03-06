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
        """
        Extracts JD intelligence from a PDF using Gemini Multimodal Vision.
        Reads bytes ONCE and reuses for all passes to avoid EOF pointer issues.
        """
        import io
        try:
            logger.info(f"[JD-PDF] Initiating Multimodal Extraction for: {pdf_file.name}")

            # Read all bytes ONCE
            pdf_file.seek(0)
            pdf_bytes = pdf_file.read()

            def make_pdf_file(bytes_content):
                """Create a fresh BytesIO with a .name attr for mime-type detection."""
                buf = io.BytesIO(bytes_content)
                buf.name = pdf_file.name  # Preserve original filename
                return buf

            system_prompt = JDExtractionService._get_pass1_system_prompt()
            prompt = (
                f"Extract JD details from the provided PDF file (Filename: {pdf_file.name}). "
                "1. READ the text and extract ALL academic/role fields. "
                "2. LOOK at visual branding (logos, headers) and the filename to identify the COMPANY NAME. "
                "If the filename contains a company name (e.g. 'PE Job Description'), that is a strong hint."
            )

            # Pass 1: Full multimodal extraction
            raw_res = BrainOrchestrator.generate_multimodal(
                prompt,
                system_prompt=system_prompt,
                files=[make_pdf_file(pdf_bytes)],
                model_name='gemini-1.5-pro'
            )

            if not raw_res:
                logger.warning("[JD-PDF] Multimodal pass returned empty. Falling back to text.")
                return JDExtractionService._extract_via_text_fallback_bytes(pdf_bytes, pdf_file.name)

            pass1_data = JDExtractionService._parse_json(raw_res)
            if not pass1_data:
                return JDExtractionService._extract_via_text_fallback_bytes(pdf_bytes, pdf_file.name)

            # Pass 2: Dedicated branding discovery (using filename hint)
            c_name = pass1_data.get('company_name')
            if not c_name or c_name == "Not Specified":
                logger.info("[JD-PDF] Company name missing — running branding reconnaissance pass.")
                pass1_data['company_name'] = JDExtractionService._run_company_discovery(
                    make_pdf_file(pdf_bytes), filename=pdf_file.name, is_image=True
                )

            # Final Fallback: Filename check if still Not Specified
            if pass1_data.get('company_name') == "Not Specified":
                fname = pdf_file.name.lower()
                # Remove common extensions and noise words
                noise = {"jd", "job", "description", "placement", "campus", "hiring", "drive", ".pdf", ".docx", ".jpg", "data", "sheet", "brochure"}
                # Split on any non-alphanumeric character
                parts = re.split(r'[^a-zA-Z0-9]', fname)
                potential = [p for p in parts if p and p not in noise and len(p) >= 2]
                if potential:
                    # Filter out purely generic words
                    generic = {"for", "the", "new", "freshers", "fresh", "yrs", "yr", "iv", "zero", "backlogs"}
                    filtered = [p for p in potential if p not in generic]
                    if filtered:
                        # If first part is just 'pe', try to find a more meaningful one if available
                        winner = filtered[0].upper()
                        if winner == 'PE' and len(filtered) > 1:
                           winner = f"{winner} {filtered[1].upper()}"
                        pass1_data['company_name'] = winner
                        logger.info(f"[JD-FILENAME-FALLBACK] Extracted {pass1_data['company_name']} from filename {pdf_file.name}.")

            return JDExtractionService._run_enhancement_pass(pass1_data, "PDF_EXTRACTED_JD")

        except Exception as e:
            logger.error(f"[JD-PDF-ERROR] {e}", exc_info=True)
            try:
                pdf_file.seek(0)
                return JDExtractionService._extract_via_text_fallback(pdf_file)
            except:
                return {"error": str(e)}


    @staticmethod
    def _extract_via_text_fallback(pdf_file) -> Dict[str, Any]:
        """Standard text-based extraction as a backup."""
        text = ""
        try:
            pdf_file.seek(0)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            return {"error": f"Total extraction failure: {str(e)}"}
            
        return JDExtractionService.extract_from_text(text)

    @staticmethod
    def _extract_via_text_fallback_bytes(pdf_bytes: bytes, filename: str = "document.pdf") -> Dict[str, Any]:
        """Text-based extraction from raw bytes (used when the file pointer is not available)."""
        import io
        buf = io.BytesIO(pdf_bytes)
        buf.name = filename
        return JDExtractionService._extract_via_text_fallback(buf)

    @staticmethod
    def extract_from_image(image_file) -> Dict[str, Any]:
        """
        Extracts JD intelligence directly from an image (logo, scannable, etc.)
        Uses Multimodal Vision.
        """
        from PIL import Image
        import io
        
        try:
            img = Image.open(image_file)
            # Ensure it's in a format Gemini likes
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            logger.info(f"[JD-IMAGE] Processing {image_file.name} via Neural Vision.")
            
            system_prompt = JDExtractionService._get_pass1_system_prompt()
            prompt = "Analyse this Job Description image. EXTRACT ALL DETAILS into JSON. Pay special attention to LOGOS or BRANDING to identify the Company Name."
            
            raw_res = BrainOrchestrator.generate_multimodal(prompt, system_prompt=system_prompt, files=[img])
            
            if not raw_res:
                return {"error": "Neural Vision failed to respond."}
                
            pass1_data = JDExtractionService._parse_json(raw_res)
            if not pass1_data:
                return {"error": "AI Engine (Pass 1) output was unparseable.", "raw": raw_res}

            # Targeted Recovery (If Company is missing)
            if pass1_data.get('company_name') == "Not Specified":
                pass1_data['company_name'] = JDExtractionService._run_company_discovery(img, is_image=True)

            return JDExtractionService._run_enhancement_pass(pass1_data, "IMAGE_EXTRACTED_JD")
            
        except Exception as e:
            logger.error(f"[JD-IMAGE-ERROR] {e}")
            return {"error": f"Image processing failed: {str(e)}"}

    @staticmethod
    def _get_pass1_system_prompt():
        return """
You are an expert HR Intelligence Engine for Tier-1 University Placements.
Analyse the provided JD (text or image) and produce a FIRST-PASS JSON extraction.

STRICT RULES:
- Output ONLY valid JSON. Absolutely no conversational text. No markdown formatting. No markdown code blocks (```).
- Start your response immediately with the character { and end with }.
- FIND THE COMPANY NAME: Look for it in headers, footers, logos, or "About the Company". It's the most prominent brand name.
- Use "Not Specified" for unknown STRINGS. 
- Use EXACTLY 0.0 for unknown NUMBERS.
- Use an EMPTY ARRAY [] for unknown LISTS/ARRAYS.
- DO NOT use any comments inside the JSON.

BRANCH NORMALIZATION RULES (CRITICAL):
- Always split compound branch specs into SEPARATE array items. Example: "CS/IT Engineering" → ["CS", "IT"]
- Always use SHORT STANDARD ABBREVIATIONS: "CSE" not "Computer Science", "IT" not "Information Technology", "ECE" not "Electronics", "ME" not "Mechanical", "CE" not "Civil"
- If JD says "Any branch" or "All branches" → return []
- Each array item should be a single short branch code

YOUR REQUIRED OUTPUT SCHEMA (Do not add or remove keys):
{
  "is_valid": true,
  "company_name": "Not Specified",
  "role": "Not Specified",
  "narrative_summary": "Not Specified",
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
  "custom_criteria": {},
  "social_blurbs": []
}
"""

    @staticmethod
    def _run_company_discovery(source, filename=None, is_image=False) -> str:
        """Dedicated Pass 2 to recover missing company names with self-verification."""
        logger.info(f"[JD-RECOVERY] Identifying Company Identity from {'Image' if is_image else 'Text'} source.")
        hint = f" (Filename hint: {filename})" if filename else ""
        prompt = (
            f"IDENTITY RECONNAISSANCE MISSION: Your goal is to find the Company name in this document.{hint} "
            "1. Scan the TOP HEADER for logos and branding text. "
            "2. Scan the BOTTOM FOOTER for copyright notices. "
            "3. Scan for an 'About the Company' section. "
            "4. Check the email contact domain. "
            "STRICT RULE: Only return a name that is VISIBLY PRESENT. "
            "Return ONLY the company name as a plain string. If found, return 'Company: [Name]'. If absolutely not found, return 'Not Specified'."
        )
        if is_image:
            # Use PRO for vision tasks requiring higher branding accuracy
            res = BrainOrchestrator.generate_multimodal(prompt, system_prompt="You are an identity recovery agent.", files=[source], model_name='gemini-1.5-pro')
        else:
            snippet = source[:10000] # Focus on the header/about section
            res = BrainOrchestrator.generate_text(f"JD TEXT SNIPPET:\n{snippet}\n\n{prompt}", system_prompt="You are an identity recovery agent.")
        
        if res and "Not Specified" not in res and len(res) < 100:
            name = res.replace('The company name is ', '').replace('Company:', '').strip().strip('"').strip("'")
            
            # Anti-Hallucination: Fuzzy string verification if text-based
            if not is_image:
                clean_name = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
                clean_source = re.sub(r'[^a-zA-Z0-9]', '', source.lower())
                if clean_name not in clean_source:
                    logger.warning(f"[JD-HALLUCINATION-PREVENTED] AI suggested '{name}' but it was not found in the source text.")
                    return "Not Specified"
                    
            return name
        return "Not Specified"

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any] | None:
        """Safely parse JSON from an AI response that may contain markdown fences or comments."""
        try:
            cleaned = raw.strip()
            
            # Extract JSON from potential code fences or conversational text
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                json_str = match.group()
                
                # Remove JS-style single-line comments // that LLMs sometimes hallucinate
                json_str = re.sub(r'(?<![:"a-zA-Z])//.*', '', json_str)
                
                # Fallback: fix unquoted "Not Specified" or "None" if hallucinated
                json_str = re.sub(r':\s*Not Specified\b', ': "Not Specified"', json_str)
                json_str = re.sub(r':\s*None\b', ': null', json_str)
                
                parsed = json.loads(json_str)

                # ─────────────────────────────────────────────────────────────
                # STRICTURE TYPE RECONSTRUCTION
                # ─────────────────────────────────────────────────────────────
                # Ensure numeric fields don't accidentally get "Not Specified" string
                num_fields = ["min_cgpa", "min_ug_percentage", "min_10th_percent", "min_12th_percent", "allowed_active_backlogs", "difficulty_level"]
                for f in num_fields:
                    val = parsed.get(f)
                    if isinstance(val, (str, type(None))):
                        try:
                            parsed[f] = float(val) if val and val != "Not Specified" else 0.0
                        except:
                            parsed[f] = 0.0

                # Intelligence Normalization: Fix swapped CGPA/Percentage
                cgpa_val = float(parsed.get("min_cgpa", 0.0))
                ug_val = float(parsed.get("min_ug_percentage", 0.0))
                
                # If CGPA > 10, it's likely a percentage
                if cgpa_val > 10.0 and ug_val == 0.0:
                    parsed["min_ug_percentage"] = cgpa_val
                    parsed["min_cgpa"] = 0.0
                # If Percentage < 10 and not 0, it's likely a CGPA
                elif 0.0 < ug_val <= 10.0 and cgpa_val == 0.0:
                    parsed["min_cgpa"] = ug_val
                    parsed["min_ug_percentage"] = 0.0

                # Ensure list fields are actually lists, not "Not Specified" strings
                list_fields = ["eligible_branches", "eligible_batches", "qualifications", "contact_details", "hiring_process", "primary_skills", "secondary_skills", "key_highlights", "social_blurbs"]
                for f in list_fields:
                    val = parsed.get(f)
                    if isinstance(val, str) or val is None:
                        # If a single string is given like "2024, 2025", try to split it
                        if val and "," in val:
                            parsed[f] = [x.strip() for x in val.split(",")]
                        elif val and val != "Not Specified":
                            parsed[f] = [val]
                        else:
                            parsed[f] = []
                    elif isinstance(val, list):
                        # Clean up "Not Specified" elements within lists
                        parsed[f] = [x for x in val if x != "Not Specified"]
                        
                        # Special handling for batches (must be integers)
                        if f == "eligible_batches":
                            cleaned_batches = []
                            for b in parsed[f]:
                                try:
                                    # Support strings like "Class of 2024" or just "2024"
                                    nums = re.findall(r'\d{4}', str(b))
                                    for n in nums:
                                        cleaned_batches.append(int(n))
                                except:
                                    pass
                            parsed[f] = sorted(list(set(cleaned_batches)))

                        # Normalize eligible_branches: split compound specs and map to abbreviations
                        if f == "eligible_branches":
                            branch_map = {
                                'computer science': 'CSE', 'computer science and engineering': 'CSE',
                                'information technology': 'IT', 'information science': 'ISE',
                                'electronics': 'ECE', 'electronics and communication': 'ECE',
                                'electrical': 'EEE', 'electrical and electronics': 'EEE',
                                'mechanical': 'ME', 'civil': 'CE',
                                'cs': 'CSE', 'ce': 'CE',
                            }
                            normalized = []
                            for b in parsed[f]:
                                # Split on /, &, 'and', comma
                                parts = re.split(r'[/&,]|\band\b', str(b), flags=re.IGNORECASE)
                                for p in parts:
                                    p = p.strip()
                                    if not p:
                                        continue
                                    # Map long form to abbreviation
                                    mapped = branch_map.get(p.lower(), p)
                                    # Strip trailing noise words
                                    for noise in [' Engineering', ' Graduate', ' Science', ' Technology']:
                                        mapped = mapped.replace(noise, '').replace(noise.lower(), '').strip()
                                    if mapped and mapped not in normalized:
                                        normalized.append(mapped)
                            parsed[f] = normalized

                return parsed
        except Exception as e:
            logger.error(f"[JD-JSON-PARSE] {e}")
        return None

    @staticmethod
    def extract_from_text(text: str) -> Dict[str, Any]:
        if not text or len(text.strip()) < 50:
            return {"error": "Intelligence Core requires at least 50 JD characters."}

        jd_text = text[:40000]

        # ──────────────────────────────────────────────────────────────────
        # PASS 1 — Standard extraction with known schema
        # ──────────────────────────────────────────────────────────────────
        pass1_system = JDExtractionService._get_pass1_system_prompt()
        pass1_prompt = f"JD TEXT (ALL PAGES):\n\n{jd_text}\n\nOUTPUT ONLY THE RAW JSON OBJECT WITH NO MARKDOWN FORMATTING."
        pass1_raw = BrainOrchestrator.generate_text(pass1_prompt, system_prompt=pass1_system)

        if not pass1_raw:
            return {"error": "AI Engine (Pass 1) failed to respond."}

        pass1_data = JDExtractionService._parse_json(pass1_raw)
        if not pass1_data:
            logger.error(f"[JD-PASS1-FAIL] Raw: {pass1_raw[:500]}")
            return {"error": "Pass 1 JSON parsing failed.", "raw": pass1_raw}

        if not pass1_data.get("is_valid", True):
            return {"error": "The AI identified this as an invalid/junk JD."}
            
        # Recovery Pass for Company Name
        if pass1_data.get('company_name') == "Not Specified":
            pass1_data['company_name'] = JDExtractionService._run_company_discovery(jd_text)

        logger.info(f"[JD-EXTRACT] Found company: {pass1_data.get('company_name')}")

        # ──────────────────────────────────────────────────────────────────
        # PASS 2 — Safe Enhancement & Dynamic Discovery
        # ──────────────────────────────────────────────────────────────────
        # To prevent schema destruction by smaller LLMs, Pass 2 ONLY focuses
        # on specific enhancements, which are then merged via Python.
        pass2_system = """
You are a SENIOR HR Intelligence Auditor.
Your job is to ENHANCE the data extracted from a Job Description.

STRICT RULES:
- Output ONLY valid JSON. Absolutely no conversational text. No markdown formatting. No markdown code blocks (```).
- Start your response immediately with the character { and end with }.
- DO NOT use any comments (like //) inside the JSON output. JSON does not support comments.
- discovered_custom_criteria MUST ONLY contain actual constraints found in the text (bonds, service agreements, shifts, unique benefits, etc). DO NOT hallucinate "Not Specified". If none exist, output {}.
- social_blurbs MUST contain exactly 3 exciting WhatsApp/Telegram messages to hype the role.

YOUR REQUIRED OUTPUT SCHEMA:
{
  "improved_narrative_summary": "A highly detailed, professional paragraph summarizing the role and selling points.",
  "social_blurbs": ["Exciting emoji-rich blurb 1", "Blurb 2", "Blurb 3"],
  "discovered_custom_criteria": {}
}
"""

        pass2_prompt = (
            f"ORIGINAL JD TEXT:\n{jd_text}\n\n"
            f"FIRST-PASS SUMMARY:\n{pass1_data.get('narrative_summary', '')}\n\n"
            "Generate the enhancement JSON."
            "OUTPUT ONLY THE RAW JSON OBJECT WITH NO MARKDOWN FORMATTING."
        )

        pass2_raw = BrainOrchestrator.generate_text(pass2_prompt, system_prompt=pass2_system)
        
        logger.debug(f"[JD-EXTRACT] Pass 2 Raw Output: {pass2_raw}")

        if pass2_raw:
            pass2_data = JDExtractionService._parse_json(pass2_raw)
            if pass2_data:
                # Safely Merge Enhancements into Pass 1 Data
                if pass2_data.get("improved_narrative_summary"):
                    pass1_data["narrative_summary"] = pass2_data["improved_narrative_summary"]
                
                if isinstance(pass2_data.get("social_blurbs"), list):
                    pass1_data["social_blurbs"] = pass2_data["social_blurbs"]
                    
                if isinstance(pass2_data.get("discovered_custom_criteria"), dict):
                    pass1_data["custom_criteria"] = pass2_data["discovered_custom_criteria"]
                
                logger.info("[JD-EXTRACT] Two-pass extraction successful. Enhancements merged.")
            else:
                logger.warning("[JD-PASS2-JSON-FAIL] Failed to parse Pass 2. Using Pass 1 data.")
        else:
            logger.warning("[JD-PASS2-FAIL] Pass 2 returned empty. Using Pass 1 data.")

        # Ensure location is always a string
        if isinstance(pass1_data.get("location"), list):
            pass1_data["location"] = ", ".join(pass1_data["location"])

        return pass1_data

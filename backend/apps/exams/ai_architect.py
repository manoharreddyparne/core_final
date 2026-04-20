import json
import logging
from .models import QuestionBank, QuestionOption
from apps.intelligence.utils.ai_engine import call_gemini_ai

logger = logging.getLogger(__name__)

class ExamAIArchitect:
    @staticmethod
    def generate_questions(topic, count=5, q_type='MCQ', difficulty='MEDIUM'):
        """
        Generates and saves questions using AI.
        Returns the count of successfully created questions.
        """
        
        system_instr = """You are the ASEP AI Exam Architect. Your goal is to generate high-quality, high-integrity exam questions.
        
         Rules:
         1. Contextualize questions in professional scenarios.
         2. Ensure they are non-googleable.
         3. For CODING, provide:
            - problem_statement (Story-based)
            - boilerplate (MUST include CodeTantra style structure: 
                Java: `package question_[ID]; public class Solution { ... }`
                Python: `# Question [ID] \n def solution(): ...`
                C++: `// Question [ID] \n #include <iostream> \n class Solution { ... };`)
            - test_cases (Array of {input, expected_output, hidden: boolean})
            - constraints (Time/Memory)
         4. For MCQ, provide 4 distinct options with exactly one marked as correct.
         
         OUTPUT FORMAT: Return ONLY a JSON array of objects following this structure:
         [
           {
             "text": "The scenario description...", 
             "difficulty": "MEDIUM", 
             "marks": 2,
             "options": [{"text": "Choice A", "is_correct": true}, ...],
             "coding_metadata": { 
                "boilerplate": "package question_1; ...", 
                "test_cases": [...], 
                "language": "java",
                "forbidden_libraries": ["java.util.Collections"]
             }
           }
         ]
        """
        
        prompt = f"Generate {count} {difficulty} questions about: {topic}. Question Type: {q_type}."
        
        ai_response = call_gemini_ai(prompt, system_instruction=system_instr)
        
        # Strip potential markdown code blocks
        if "```json" in ai_response:
            ai_response = ai_response.split("```json")[1].split("```")[0].strip()
        elif "```" in ai_response:
            ai_response = ai_response.split("```")[1].split("```")[0].strip()

        try:
            questions_data = json.loads(ai_response)
            created_count = 0
            
            for q_data in questions_data:
                # Create the question
                q_obj = QuestionBank.objects.create(
                    text=q_data.get('text'),
                    question_type=q_type,
                    topic=topic,
                    difficulty=q_data.get('difficulty', difficulty),
                    default_marks=q_data.get('marks', 1),
                    coding_metadata=q_data.get('coding_metadata', {})
                )
                
                # Create options if MCQ/MULTI_SELECT
                if q_type in ['MCQ', 'MULTI_SELECT', 'APTITUDE']:
                    for opt_data in q_data.get('options', []):
                        QuestionOption.objects.create(
                            question=q_obj,
                            text=opt_data.get('text'),
                            is_correct=opt_data.get('is_correct', False)
                        )
                
                created_count += 1
            
            return created_count, questions_data
        except Exception as e:
            logger.error(f"Error parsing AI Question data: {e}")
            return 0, []

class DeepNeuralEvaluator:
    """
    ASEP Deep Learning Reasoning Engine for evaluation and proctoring logs.
    """
    @staticmethod
    def evaluate_subjective_answer(question_text, student_answer, marks_possible):
        """
        Uses LLM with deep academic grading logic to evaluate descriptive/coding answers.
        """
        system_instr = "You are the Senior Academic Evaluator for Nexora. Use Deep Learning reasoning to grade subjective answers based on accuracy, depth, and clarity."
        prompt = f"""
        Question: {question_text}
        Student Answer: {student_answer}
        Max Marks: {marks_possible}
        
        Provide:
        1. Score (numeric)
        2. Feedback (detailed)
        3. Plagiarism Probability (0-100%)
        
        Return JSON only: {{"score": X, "feedback": "...", "plagiarism_prob": X}}
        """
        
        response = call_gemini_ai(prompt, system_instruction=system_instr)
        try:
            # Cleanup and parse
            if "```json" in response: response = response.split("```json")[1].split("```")[0].strip()
            return json.loads(response)
        except:
            return {"score": 0, "feedback": "AI Evaluation failed to parse.", "plagiarism_prob": 0}

    @staticmethod
    def audit_proctor_logs(logs):
        """
        Analyzes a stream of proctoring events to identify deep patterns of academic dishonesty.
        """
        system_instr = "You are the ASEP Forensic Analyst. Detect sophisticated cheating patterns from log streams."
        prompt = f"Analyze these violation logs and provide a 'Cheating Confidence' score and a reason summary:\n{json.dumps(logs)}"
        
        response = call_gemini_ai(prompt, system_instruction=system_instr)
        return response


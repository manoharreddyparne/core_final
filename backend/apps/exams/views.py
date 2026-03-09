from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Exam, QuestionBank, QuestionOption, ExamQuestionMapping, ExamAttempt, ExamAnswer, ExamAntiCheatLog
from .serializers import (
    ExamSerializer, QuestionBankSerializer, ExamAttemptSerializer, 
    ExamAnswerSerializer, ExamAntiCheatLogSerializer
)
from apps.identity.permissions import IsAdminOrTeacher, IsStudentRole
from apps.intelligence.utils.ai_engine import call_gemini_ai
import json
import random



class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'manage_questions']:
            return [IsAdminOrTeacher()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='eligible')
    def list_eligible(self, request):
        """List exams eligible for the current student based on batch/course."""
        student = request.user
        # Simplified: check course/batch match
        exams = Exam.objects.filter(
            course=student.course_enrollment.course,
            batch=student.course_enrollment.batch
        )
        return Response(ExamSerializer(exams, many=True).data)


    @action(detail=True, methods=['post'], url_path='manage-questions')
    def manage_questions(self, request, pk=None):
        exam = self.get_object()
        question_ids = request.data.get('question_ids', [])
        # Bulk assign questions to exam
        ExamQuestionMapping.objects.filter(exam=exam).delete()
        for idx, qid in enumerate(question_ids):
            ExamQuestionMapping.objects.create(exam=exam, question_id=qid, order=idx)
        return Response({"status": "Questions updated"})

    @action(detail=True, methods=['get'], url_path='my-attempt')
    def my_attempt(self, request, pk=None):
        exam = self.get_object()
        student = request.user
        attempt = ExamAttempt.objects.filter(exam=exam, student=student, is_submitted=False).first()
        if not attempt:
            return Response({"detail": "No active attempt found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ExamAttemptSerializer(attempt).data)

    @action(detail=True, methods=['post'], url_path='evaluate-all')
    def evaluate_all_attempts(self, request, pk=None):
        """Trigger AI evaluation for all pending attempts of this exam."""
        exam = self.get_object()
        attempts = ExamAttempt.objects.filter(exam=exam, is_submitted=True, status='SUBMITTED')
        
        # Using the logic from ExamAttemptViewSet
        from .views import ExamAttemptViewSet
        viewset = ExamAttemptViewSet()
        
        results = []
        for attempt in attempts:
            summary = viewset._trigger_ai_grading(attempt)
            results.append({"email": attempt.student.email, "status": "Evaluated", "summary": summary})
            
        return Response({"status": f"Processed {len(results)} attempts", "results": results})



class QuestionBankViewSet(viewsets.ModelViewSet):
    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankSerializer
    permission_classes = [IsAdminOrTeacher]

    @action(detail=False, methods=['post'], url_path='bulk-upload')
    def bulk_upload(self, request):
        # Placeholder for bulk upload logic (CSV/Excel)
        return Response({"status": "Bulk upload system initialized."})


class ExamAttemptViewSet(viewsets.ModelViewSet):
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptSerializer

    def get_permissions(self):
        if self.action in ['create', 'submit_answer', 'finish']:
            return [IsStudentRole()]
        return [IsAdminOrTeacher()]

    def create(self, request, *args, **kwargs):
        exam_id = request.data.get('exam')
        exam = Exam.objects.get(id=exam_id)
        student = request.user
        
        # Check attempt limit
        existing_count = ExamAttempt.objects.filter(exam=exam, student=student, is_submitted=True).count()
        if existing_count >= exam.attempt_limit:
            return Response({"detail": "Attempt limit reached."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check window
        now = timezone.now()
        if exam.start_time and now < exam.start_time:
            return Response({"detail": "Exam has not started yet."}, status=status.HTTP_400_BAD_REQUEST)
        if exam.end_time and now > exam.end_time:
            return Response({"detail": "Exam window closed."}, status=status.HTTP_400_BAD_REQUEST)

        # Create session
        attempt = ExamAttempt.objects.create(
            exam=exam, 
            student=student,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(ExamAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_submitted:
            return Response({"detail": "Attempt already submitted."}, status=status.HTTP_400_BAD_REQUEST)
        
        question_id = request.data.get('question_id') # ExamQuestionMapping ID
        selected_option_ids = request.data.get('option_ids', [])
        text_answer = request.data.get('text_answer', '')
        
        mapping = ExamQuestionMapping.objects.get(id=question_id, exam=attempt.exam)
        
        answer_obj, _ = ExamAnswer.objects.get_or_create(attempt=attempt, question=mapping)
        if selected_option_ids:
            answer_obj.selected_options.set(selected_option_ids)
        answer_obj.text_answer = text_answer
        answer_obj.save()
        
        # Auto-grade if MCQ/MultiSelect
        self._auto_grade_answer(answer_obj)
        
        return Response({"status": "Answer saved"})

    def _auto_grade_answer(self, answer):
        qbank = answer.question.question
        if qbank.question_type == 'MCQ':
            correct_option = qbank.options.filter(is_correct=True).first()
            selected = answer.selected_options.first()
            answer.is_correct = (selected == correct_option)
            answer.manual_score = answer.question.marks_override or qbank.default_marks if answer.is_correct else 0
        elif qbank.question_type == 'MULTI_SELECT':
            correct_options = set(qbank.options.filter(is_correct=True).values_list('id', flat=True))
            selected_options = set(answer.selected_options.values_list('id', flat=True))
            answer.is_correct = (correct_options == selected_options)
            answer.manual_score = answer.question.marks_override or qbank.default_marks if answer.is_correct else 0
        answer.save()

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_submitted:
            return Response({"detail": "Already submitted."})
        
        attempt.completed_at = timezone.now()
        attempt.is_submitted = True
        attempt.status = 'SUBMITTED'
        
        # Calculate total score
        total = 0
        for ans in attempt.answers.all():
            total += (ans.manual_score or 0)
        attempt.raw_score = total
        attempt.save()

        # Trigger AI evaluation if it's a mock or mock-mode exam optionally
        # Or let the admin trigger it for official exams.
        if attempt.exam.is_mock:
            self._trigger_ai_grading(attempt)
        
        return Response({
            "status": "Exam completed",
            "score": total
        })

    @action(detail=True, methods=['post'], url_path='ai-evaluation')
    def evaluate_with_ai(self, request, pk=None):
        """Manually trigger AI evaluation for descriptive answers."""
        attempt = self.get_object()
        if not attempt.is_submitted:
            return Response({"detail": "Cannot evaluate unsubmitted attempt."}, status=status.HTTP_400_BAD_REQUEST)
        
        summary = self._trigger_ai_grading(attempt)
        return Response({"status": "AI Evaluation Complete", "summary": summary})

    def _trigger_ai_grading(self, attempt):
        """Internal helper to grade short answers using Gemini."""
        short_answers = attempt.answers.filter(question__question__question_type='SHORT_ANSWER')
        if not short_answers.exists():
            attempt.status = 'EVALUATED'
            attempt.save()
            return "No descriptive answers to grade."

        prompt_data = []
        for ans in short_answers:
            prompt_data.append({
                "id": ans.id,
                "question": ans.question.question.text,
                "student_answer": ans.text_answer,
                "max_marks": ans.question.marks_override or ans.question.question.default_marks
            })

        system_instr = """You are an AUIP AI Professor grading student exams. 
        For each answer, provide:
        1. A score (0 to max_marks)
        2. A very brief feedback (max 15 words)
        Return ONLY a JSON array of objects: [{"id": 12, "score": 2.5, "feedback": "Good depth, lacks example."}]"""
        
        response_text = call_gemini_ai(json.dumps(prompt_data), system_instruction=system_instr)
        
        total_ai_score = 0
        try:
            # Clean response text if it has markdown formatting
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            evaluation_results = json.loads(response_text)
            for res in evaluation_results:
                ans_obj = ExamAnswer.objects.get(id=res['id'], attempt=attempt)
                ans_obj.manual_score = float(res['score'])
                # Store feedback in details or a separate field if we add one (using text_answer suffix for now or just summary)
                ans_obj.save()
                total_ai_score += ans_obj.manual_score
        except Exception as e:
            return f"AI Evaluation encountered an error: {str(e)}"

        attempt.raw_score += total_ai_score
        attempt.status = 'EVALUATED'
        attempt.ai_evaluation_summary = response_text
        attempt.save()
        return response_text



class AntiCheatViewSet(viewsets.ModelViewSet):
    queryset = ExamAntiCheatLog.objects.all()
    serializer_class = ExamAntiCheatLogSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [IsStudentRole()]
        return [IsAdminOrTeacher()]

    def perform_create(self, serializer):
        attempt_id = self.request.data.get('attempt_id')
        attempt = ExamAttempt.objects.get(id=attempt_id, student=self.request.user)
        
        # Security gravity calculation
        event_type = self.request.data.get('event_type')
        gravity_weights = {
            'TAB_SWITCH': 10,
            'WINDOW_BLUR': 5,
            'FULLSCREEN_EXIT': 20,
            'ESCAPE': 2,
        }
        weight = gravity_weights.get(event_type, 1)
        attempt.violation_score += weight
        attempt.save()
        
        serializer.save(attempt=attempt)


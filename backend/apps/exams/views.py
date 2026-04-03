from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from .models import (
    Exam, ExamSection, QuestionBank, QuestionOption, 
    ExamQuestionMapping, ExamAttempt, ExamAnswer, ExamAntiCheatLog
)
from .serializers import (
    ExamSerializer, QuestionBankSerializer, ExamAttemptSerializer, 
    ExamAnswerSerializer, ExamAntiCheatLogSerializer, ExamSectionSerializer
)
from apps.identity.permissions import IsAdminOrTeacher, IsStudentRole
from apps.intelligence.utils.ai_engine import call_gemini_ai
import json
import random

class ExamViewSet(viewsets.ModelViewSet):
    queryset = Exam.objects.all()
    serializer_class = ExamSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'manage_questions', 'generate_ai_questions']:
            return [IsAdminOrTeacher()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='generate-ai-questions')
    def generate_ai_questions(self, request, pk=None):
        """Uses AI to generate scenario-based questions for this exam."""
        from .ai_architect import ExamAIArchitect
        exam = self.get_object()
        
        topic = request.data.get('topic', exam.title)
        count = int(request.data.get('count', 5))
        difficulty = request.data.get('difficulty', 'MEDIUM')
        q_type = request.data.get('type', 'MCQ')

        # Generate and save to DB
        created_count, details = ExamAIArchitect.generate_questions(
            topic=topic, 
            count=count, 
            q_type=q_type, 
            difficulty=difficulty
        )
        
        # Link to exam (create a default section if none exists)
        if created_count > 0:
            section, _ = ExamSection.objects.get_or_create(
                exam=exam, 
                title=f"AI Generated: {topic}",
                defaults={'order': 0}
            )
            
            # Fetch the question IDs from the details or the DB (mapping them)
            # For simplicity in this demo, we use the latest created questions
            latest_qs = QuestionBank.objects.filter(topic=topic).order_by('-created_at')[:created_count]
            for idx, q in enumerate(latest_qs):
                ExamQuestionMapping.objects.create(
                    exam=exam,
                    section=section,
                    question=q,
                    order=idx
                )

        return Response({
            "status": f"Successfully generated {created_count} questions",
            "section": f"AI Generated: {topic}"
        })

    @action(detail=True, methods=['get'], url_path='download-report')
    def download_report(self, request, pk=None):
        """Generates and returns the forensic Excel report."""
        from .reports import ExamForensicReporter
        from django.http import HttpResponse
        
        exam = self.get_object()
        excel_data = ExamForensicReporter.generate_excel_report(exam.id)
        
        response = HttpResponse(
            excel_data,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="ASEP_Report_{exam.id}_{timezone.now().date()}.xlsx"'
        return response

    @action(detail=False, methods=['get'], url_path='eligible')
    def list_eligible(self, request):
        student = request.user
        now = timezone.now()
        exams = Exam.objects.filter(
            Q(start_time__isnull=True) | Q(start_time__lte=now)
        ).filter(
            Q(end_time__isnull=True) | Q(end_time__gte=now)
        )

        enrollment = getattr(student, 'course_enrollment', None)
        if enrollment is not None:
            exams = exams.filter(course=enrollment.course, batch=enrollment.batch)
        else:
            student_profile = getattr(student, 'student_profile', None)
            if student_profile is not None:
                batch_filters = Q(batch__isnull=True)
                if student_profile.batch:
                    batch_filters |= Q(batch__name__iexact=student_profile.batch)
                if student_profile.roll_number:
                    batch_filters |= Q(batch__roll_numbers__contains=[student_profile.roll_number])
                exams = exams.filter(batch_filters)

        return Response(ExamSerializer(exams, many=True).data)

class ExamAttemptViewSet(viewsets.ModelViewSet):
    queryset = ExamAttempt.objects.all()
    serializer_class = ExamAttemptSerializer

    def get_permissions(self):
        if self.action in ['create', 'submit_answer', 'finish', 'log_violation']:
            return [IsStudentRole()]
        return [IsAdminOrTeacher()]

    def create(self, request, *args, **kwargs):
        exam_id = request.data.get('exam')
        exam = get_object_or_404(Exam, id=exam_id)
        student = request.user
        now = timezone.now()
        
        # 1. Device Security Check
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        is_mobile = any(x in user_agent for x in ['iphone', 'android', 'mobile', 'ipad'])
        if exam.device_restriction == 'LAPTOP_ONLY' and is_mobile:
            return Response({
                "detail": "This exam is restricted to Laptop/Desktop devices only.",
                "code": "DEVICE_RESTRICTED"
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Availability and attempt limits
        if exam.start_time and now < exam.start_time:
            return Response({"detail": "Exam has not started yet."}, status=status.HTTP_400_BAD_REQUEST)
        if exam.end_time and now > exam.end_time:
            return Response({"detail": "Exam window closed."}, status=status.HTTP_400_BAD_REQUEST)

        existing_count = ExamAttempt.objects.filter(exam=exam, student=student, is_submitted=True).count()
        if existing_count >= exam.attempt_limit:
            return Response({"detail": "Attempt limit reached."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Attempt Management
        existing_attempt = ExamAttempt.objects.filter(exam=exam, student=student, is_submitted=False).first()
        if existing_attempt:
            if exam.allow_resume:
                # Return existing attempt to resume
                return Response(ExamAttemptSerializer(existing_attempt).data)
            else:
                return Response({"detail": "Active attempt exists but resume is disabled."}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Security Hardening
        attempt = ExamAttempt.objects.create(
            exam=exam,
            student=student,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            browser_fingerprint=request.data.get('fingerprint', '')
        )
        return Response(ExamAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def log_violation(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_submitted or attempt.is_blocked:
             return Response({"status": "ignored"})

        event_type = request.data.get('event_type')
        details = request.data.get('details', {})
        
        # ASEP Severity Standard Scoring
        weights = {
            'TAB_SWITCH': 5,
            'WINDOW_BLUR': 3,
            'FULLSCREEN_EXIT': 15,
            'DEV_TOOLS_DETECTED': 15,
            'MULTIPLE_FACES_DETECTED': 20,
            'NO_FACE_DETECTED': 10,
            'INTERDICTED_SHORTCUT': 10, # Copy/Paste/Print
            'RIGHT_CLICK': 5,
            'MULTI_SCREEN_DETECTED': 25
        }
        weight = weights.get(event_type, 1)
        attempt.violation_score += weight
        
        # Security Policy Enforcement (Decision Logic)
        # Threshold is normalized (e.g. 30 pts might be the 'suspicious' bar)
        if attempt.exam.strict_mode:
            limit = attempt.exam.violation_threshold or 30
            if attempt.violation_score >= limit:
                attempt.is_blocked = True
                attempt.blocked_reason = f"Security Violation: Automatic termination due to [{event_type}] exceeding threshold."
                attempt.status = 'BLOCKED'
        
        attempt.save()
        
        ExamAntiCheatLog.objects.create(
            attempt=attempt,
            event_type=event_type,
            details=details,
            evidence_image_url=request.data.get('image_url')
        )
        
        return Response({
            "violation_score": attempt.violation_score,
            "is_blocked": attempt.is_blocked,
            "blocked_reason": attempt.blocked_reason
        })

    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_submitted or attempt.is_blocked:
            return Response({"detail": "Submission locked."}, status=status.HTTP_400_BAD_REQUEST)

        mapping_id = request.data.get('mapping_id') or request.data.get('question_id')
        mapping = get_object_or_404(ExamQuestionMapping, id=mapping_id, exam=attempt.exam)
        
        answer_obj, _ = ExamAnswer.objects.get_or_create(attempt=attempt, question_mapping=mapping)
        answer_obj.text_answer = request.data.get('text_answer', '')
        
        if mapping.question.question_type in ['MCQ', 'MULTI_SELECT']:
            answer_obj.selected_options.set(request.data.get('option_ids', []))
            self._auto_grade_objective(answer_obj)
        elif mapping.question.question_type == 'CODING':
            # Run sandbox placeholder
            answer_obj.compilation_data = {"status": "pending_sandbox_run"}
        
        answer_obj.save()
        return Response({"status": "saved"})

    def _auto_grade_objective(self, answer):
        q = answer.question_mapping.question
        if q.question_type == 'MCQ':
            correct = q.options.filter(is_correct=True).first()
            selected = answer.selected_options.first()
            answer.is_correct = (selected == correct)
            answer.manual_score = answer.question_mapping.marks_override or q.default_marks if answer.is_correct else 0
        elif q.question_type == 'MULTI_SELECT':
            correct = set(q.options.filter(is_correct=True).values_list('id', flat=True))
            selected = set(answer.selected_options.values_list('id', flat=True))
            answer.is_correct = (selected == correct)
            answer.manual_score = answer.question_mapping.marks_override or q.default_marks if answer.is_correct else 0
        else:
            answer.is_correct = False
            answer.manual_score = answer.manual_score or 0
        answer.save()

    @action(detail=True, methods=['post'])
    def finish(self, request, pk=None):
        attempt = self.get_object()
        if attempt.is_submitted:
            return Response({"detail": "Already submitted."})
        
        attempt.is_submitted = True
        attempt.completed_at = timezone.now()
        attempt.status = 'SUBMITTED'
        
        # Re-calculate score
        total = 0
        for ans in attempt.answers.all():
            total += (ans.manual_score or 0)
        attempt.raw_score = total
        attempt.save()

        return Response({
            "status": "Exam Submitted", 
            "score": total if attempt.exam.show_results_immediately else "withheld"
        })

class ExamAntiCheatLogViewSet(viewsets.ModelViewSet):
    queryset = ExamAntiCheatLog.objects.all()
    serializer_class = ExamAntiCheatLogSerializer
    permission_classes = [IsAdminOrTeacher]

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Faculty verification of a violation for AI retraining."""
        from .intelligence import ForensicAIController
        
        is_genuine = request.data.get('is_genuine', True)
        comment = request.data.get('comment', '')
        
        success = ForensicAIController.verify_event(
            log_id=pk, 
            faculty_id=request.user.id, 
            is_genuine=is_genuine, 
            comment=comment
        )
        
        if success:
            return Response({"status": "Verified: Event tagged for neural retraining."})
        return Response({"status": "Error"}, status=status.HTTP_400_BAD_REQUEST)

class QuestionBankViewSet(viewsets.ModelViewSet):
    queryset = QuestionBank.objects.all()
    serializer_class = QuestionBankSerializer
    permission_classes = [IsAdminOrTeacher]

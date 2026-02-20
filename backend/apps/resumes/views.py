from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import StudentResume, ResumeTemplate, ResumeCustomizationAudit
from apps.intelligence.models import LLMContext
from apps.core_brain.services import BrainOrchestrator, ATSService
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.utils.response_utils import success_response, error_response

class ResumeViewSet(viewsets.ModelViewSet):
    """
    Advanced Resume Builder ViewSet with AI/RAG capabilities.
    """
    authentication_classes = [TenantAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = StudentResume.objects.all()

    def get_queryset(self):
        # Isolation: Students only see their own resumes
        if self.request.user.role == 'STUDENT':
            return StudentResume.objects.filter(student=self.request.user.academic_ref)
        return StudentResume.objects.all()

    @action(detail=True, methods=['post'])
    def ai_optimize(self, request, pk=None):
        """
        Uses RAG (Student Projects/Skills) + Target JD to optimize the resume.
        """
        resume = self.get_object()
        target_jd = request.data.get('target_jd', '')
        
        if not target_jd:
            return error_response("Target Job Description (JD) is required for optimization.")

        # Logic: 
        # 1. Fetch RAG Context for student
        # 2. Match Context with JD using LLM
        # 3. Update Resume Draft with suggested tweaks
        
        student = resume.student
        guidance = BrainOrchestrator.get_llm_guidance(student.id, f"Optimize my resume for this JD: {target_jd}")
        
        # Audit the optimization
        ResumeCustomizationAudit.objects.create(
            resume=resume,
            target_jd=target_jd,
            ai_suggestions_applied=[guidance]
        )
        
        resume.is_ai_optimized = True
        resume.save()

        return success_response("Resume optimized via RAG logic", data={
            "optimization_summary": guidance,
            "resume_id": resume.id
        })

    @action(detail=True, methods=['get'])
    def check_ats_fit(self, request, pk=None):
        """
        Calculates ATS fit against a specific Placement Drive.
        """
        resume = self.get_object()
        drive_id = request.query_params.get('drive_id')
        
        if not drive_id:
            return error_response("Drive ID is required.")
            
        analysis = ATSService.analyze_resume_fit(resume.student.id, drive_id)
        
        return success_response("ATS analysis complete", data={
            "score": analysis.fit_score,
            "missing": analysis.missing_keywords,
            "advice": analysis.suggested_improvements
        })

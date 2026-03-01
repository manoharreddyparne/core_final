from django.db import models
from apps.auip_institution.models import StudentAcademicRegistry
from apps.placement.models import PlacementDrive

class LLMContext(models.Model):
    """
    RAG (Retrieval-Augmented Generation) context storage for the Student.
    Feeds the LLM with personalized data chunks.
    """
    student_id = models.IntegerField(db_index=True, null=True, blank=True) # Decoupled from tenant model for global migration compatibility
    
    category = models.CharField(max_length=50, default='RESUME') # RESUME, PROJECTS, INTERVIEW_PREP
    content_chunk = models.TextField()
    
    embedding_vector = models.JSONField(null=True, blank=True, help_text="Vector representation for semantic search")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ATSAnalysis(models.Model):
    """
    Detailed ATS tracking and JD Matching.
    """
    student_id = models.IntegerField(db_index=True, null=True, blank=True)
    drive_id = models.IntegerField(null=True, blank=True)
    
    # Analysis Result
    fit_score = models.IntegerField(default=0, help_text="0-100 score matching student to JD")
    missing_keywords = models.JSONField(default=list)
    suggested_improvements = models.TextField()
    
    # Weakness Identification
    technical_weaknesses = models.JSONField(default=list)
    communication_weaknesses = models.JSONField(default=list)
    
    raw_jd_copy = models.TextField(blank=True, help_text="Copy of JD at time of analysis")
    
    analyzed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ATS: {self.student.roll_number} for {self.drive}"

class LLMInteraction(models.Model):
    """
    Tracks LLM guidance sessions.
    """
    student_id = models.IntegerField(db_index=True, null=True, blank=True)
    
    prompt = models.TextField()
    response = models.TextField()
    
    # Trace the logic
    using_rag = models.BooleanField(default=False)
    context_used = models.ManyToManyField(LLMContext, blank=True)
    
    tokens_in = models.IntegerField(default=0)
    tokens_out = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

class IntelligenceReport(models.Model):
    """
    Consolidated reports for TPOs/Admins explaining student performance using LLM logic.
    """
    report_type = models.CharField(max_length=50, choices=[('DROPOUT_RISK', 'Dropout Risk'), ('PLACEMENT_READINESS', 'Placement Readiness')])
    target_identifier = models.CharField(max_length=255, help_text="Roll number or Batch year")
    
    summary = models.TextField()
    ai_logic_explanation = models.TextField(help_text="LLM generated reasoning for the report values")
    
    data_snapshot = models.JSONField(help_text="Raw data metrics at time of report")
    
    generated_at = models.DateTimeField(auto_now_add=True)

class AIQuerySession(models.Model):
    """
    Tracks LLM-powered interactions (e.g., student asking career advice, resume help).
    """
    student_id = models.IntegerField(db_index=True, null=True, blank=True)
    
    query_text = models.TextField()
    ai_response = models.TextField()
    
    context_type = models.CharField(
        max_length=50, 
        choices=[('CAREER', 'Career Advice'), ('RESUME', 'Resume Analysis'), ('TECH', 'Technical Doubt')],
        default='CAREER'
    )
    
    tokens_used = models.IntegerField(default=0)
    latency_ms = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

class StudentResumeInsight(models.Model):
    """
    AI-generated analysis of a student's profile/resume.
    """
    student_id = models.IntegerField(unique=True, null=True, blank=True)
    
    score = models.IntegerField(help_text="ATS/Compatibility score (0-100)")
    suggested_roles = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    
    improvement_plan = models.TextField()
    
    last_analyzed = models.DateTimeField(auto_now=True)

class PlacementTrendInsight(models.Model):
    """
    Global analytics derived by AI for the institution.
    """
    title = models.CharField(max_length=255)
    insight_content = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)
    
class AIChatConversation(models.Model):
    """
    Groups AI interactions into distinct conversations (threads).
    Now supports both Students (via registry) and Admins/Faculty (via generic user ID).
    """
    # Identify the user
    user_id = models.IntegerField(null=True, blank=True, help_text="ID of the authenticated user (Student/Admin/Faculty)")
    user_role = models.CharField(max_length=50, null=True, blank=True, help_text="Role of the user at the time of session")
    
    # Optional legacy link for deep student integration
    student_id = models.IntegerField(null=True, blank=True, help_text="Legacy Student Registry ID for deep student integration")
    
    title = models.CharField(max_length=255, default="New Conversation")
    
    # Optional: track context or goal
    context_type = models.CharField(max_length=50, default='GENERAL') 
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} ({self.user_role or 'Unknown'}:{self.user_id})"

class AIChatMessage(models.Model):
    """
    Individual messages within a conversation.
    """
    conversation = models.ForeignKey(AIChatConversation, on_delete=models.CASCADE, related_name='messages')
    
    role = models.CharField(max_length=20, choices=[('user', 'User'), ('assistant', 'AI')])
    content = models.TextField()
    
    # Metadata
    tokens_used = models.IntegerField(default=0)
    latency_ms = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."

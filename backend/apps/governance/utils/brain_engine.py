import logging
import random
import json
from django.utils import timezone
from django.db import models
from apps.governance.models import (
    StudentBehaviorLog, 
    StudentIntelligenceProfile, 
    GovernanceBrainState,
    GovernancePolicy
)

logger = logging.getLogger(__name__)

class GovernanceBrain:
    """
    The core cognitive engine of the Nexora platform.
    Responsible for behavioral scoring, risk assessment, and policy enforcement.
    """
    
    @staticmethod
    def get_latest_brain_state():
        state = GovernanceBrainState.objects.filter(is_active=True).first()
        if not state:
            # Initialize a new brain if none exists
            state = GovernanceBrainState.objects.create(
                model_version="v1.0.0-initial",
                weights_metadata={
                    "readiness_weight": 0.4,
                    "behavior_weight": 0.6,
                    "risk_threshold": 0.85
                },
                is_active=True
            )
        return state

    @staticmethod
    def retrain_for_student(student_profile):
        """
        'Retrains' the decision matrix for a specific student based on their logs.
        """
        logs = StudentBehaviorLog.objects.filter(student=student_profile.student).order_by('-timestamp')[:100]
        
        # Simulated Neural Calculation
        # In a real environment, this might involve an AutoEncoder to find anomalies
        # or a Reinforcement Learning agent deciding the next best action.
        
        pos_events = logs.filter(event_type__in=['BLOG_READ', 'QUIZ_START', 'RESUME_BUILD']).count()
        neg_events = logs.filter(event_type__in=['POLICY_VIOLATION', 'FAILED_ATTEMPT']).count() # Mocked neg events
        
        # Dynamic behavior score update
        new_score = student_profile.behavior_score
        if pos_events > 5:
            new_score = min(100, new_score + random.randint(1, 4))
        if neg_events > 0:
            new_score = max(0, new_score - (neg_events * 5))
            
        student_profile.behavior_score = new_score
        student_profile.risk_factor = random.uniform(0.0, 0.2) if new_score > 60 else random.uniform(0.4, 0.9)
        
        # Decide active controls based on policies
        policies = GovernancePolicy.objects.filter(is_active=True).order_by('priority')
        controls = {}
        for policy in policies:
            # Simple rule evaluation
            conditions = policy.conditions
            met = True
            if 'behavior_score_min' in conditions and new_score < conditions['behavior_score_min']:
                met = False
            
            if met:
                controls.update(policy.actions)
        
        student_profile.active_controls = controls
        student_profile.save()
        
        # Update Global Brain State metrics
        state = GovernanceBrain.get_latest_brain_state()
        state.samples_trained += 1
        state.accuracy_score = min(1.0, state.accuracy_score + 0.001)
        state.save()
        
        return {
            "behavior_score": new_score,
            "risk_factor": student_profile.risk_factor,
            "controls": controls
        }

    @staticmethod
    def global_retrain():
        """
        Triggered when 'data grows'. Consolidates patterns from all users.
        """
        # In a real ML context, this would be a Keras/PyTorch training loop
        # For now, we update global weights based on platform-wide engagement levels.
        state = GovernanceBrain.get_latest_brain_state()
        
        avg_behavior = StudentIntelligenceProfile.objects.all().aggregate(avg=models.Avg('behavior_score'))['avg'] or 50
        
        # Adjust weights dynamically
        weights = state.weights_metadata
        if avg_behavior < 40:
            weights['behavior_weight'] += 0.05 # Stricter monitoring
        else:
            weights['behavior_weight'] -= 0.01 # Relax
            
        state.model_version = f"v1.0.{state.samples_trained // 100}"
        state.weights_metadata = weights
        state.save()
        
        logger.info(f"Governance Brain global retraining complete. New version: {state.model_version}")


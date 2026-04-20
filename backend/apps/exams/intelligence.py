import logging
from .models import ExamAntiCheatLog

logger = logging.getLogger(__name__)

class ForensicAIController:
    """
    ASEP Intelligence Controller: Manages the 'Training Feedback Loop'.
    Converts faculty raw feedback into structured datasets for DL model retraining.
    """
    
    @staticmethod
    def verify_event(log_id, faculty_id, is_genuine, comment=""):
        """
        Marks an event as verified or false positive.
        Verified events are tagged for the 'Neural Retraining Pipeline'.
        """
        try:
            log = ExamAntiCheatLog.objects.get(id=log_id)
            log.is_verified = is_genuine
            log.faculty_feedback = f"Verified by {faculty_id}: {comment}"
            log.save()
            
            if is_genuine:
                logger.info(f"[AI_TRAINING] High-confidence violation captured: {log_id}")
                # Logic to export for Sagemaker/Vertex AI retraining could go here
                
            return True
        except Exception as e:
            logger.error(f"Failed to verify forensic event: {e}")
            return False

    @staticmethod
    def get_training_dataset():
        """
        Retrieves all verified violations for the categorical retraining process.
        """
        verified_logs = ExamAntiCheatLog.objects.filter(is_verified=True)
        dataset = []
        for log in verified_logs:
            dataset.append({
                'type': log.event_type,
                'details': log.details,
                'evidence': log.evidence_image_url
            })
        return dataset

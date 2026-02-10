"""
Email and Invitation Services for Student Activation
"""

import secrets
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from apps.identity.models.invitation import StudentInvitation
from apps.identity.models.core import CoreStudent


class NotificationService:
    """Centralized service for sending emails and notifications"""
    
    @staticmethod
    def send_activation_link(student, invitation):
        """Send activation link to student's official email"""
        
        activation_url = f"{settings.FRONTEND_URL}/activate?token={invitation.token}"
        
        subject = "Welcome to AUIP - Activate Your Account"
        message = f"Hello {student.full_name},\n\n" \
                  f"Welcome to the Adaptive University Intelligence Platform.\n" \
                  f"Please activate your account by clicking the link below:\n\n" \
                  f"{activation_url}\n\n" \
                  f"This link will expire in 48 hours.\n\n" \
                  f"Regards,\nAUIP Team"
        
        # In a real production environment, we'd use a nice HTML template here
        return send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.official_email],
            fail_silently=False,
        )


class ActivationService:
    """Service to handle the logic of creating invites and activating accounts"""
    
    @staticmethod
    def create_invitation(student_ref):
        """Create a new invitation for a student ref"""
        student = CoreStudent.objects.get(stu_ref=student_ref)
        
        # Generate a secure token
        token = secrets.token_urlsafe(32)
        
        # Update or create invitation
        invitation, created = StudentInvitation.objects.update_or_create(
            student=student,
            defaults={
                'token': token,
                'sent_at': timezone.now(),
                'is_used': False,
                'expires_at': timezone.now() + timezone.timedelta(hours=48)
            }
        )
        
        # Update student status
        student.status = 'INVITED'
        student.save()
        
        # Send Email
        NotificationService.send_activation_link(student, invitation)
        
        return invitation

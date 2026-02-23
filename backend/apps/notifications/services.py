from typing import List, Optional
from apps.notifications.models import Notification
from django.db import models

class NotificationDispatcher:
    """
    Centralized service to handle notification dispatching across the platform.
    """
    @staticmethod
    def send_notification(
        user: any, 
        title: str, 
        message: str, 
        type: str = 'SYSTEM', 
        action_link: str = ""
    ) -> Notification:
        """
        Creates an in-app notification record. 
        Resolves the Public Recipient ID to ensure cross-schema visibility.
        """
        from apps.identity.models import User as GlobalUser
        from django_tenants.utils import schema_context
        
        recipient_id = None
        email = getattr(user, 'email', None)

        if email:
            # Look up the ID in the global identity registry
            with schema_context('public'):
                global_user = GlobalUser.objects.filter(email=email).first()
                if global_user:
                    # 🛡️ Role Guard: Placement notifications ONLY for students
                    if type == 'PLACEMENT' and global_user.role != GlobalUser.Roles.STUDENT:
                         return None
                    recipient_id = global_user.id
        
        # Fallback to local ID if email mapping fails
        if not recipient_id:
            recipient_id = getattr(user, 'user_id', None) or getattr(user, 'id', None)
        
        if not recipient_id:
            raise ValueError("NotificationDispatcher requires a valid recipient_id or email.")

        notification = Notification.objects.create(
            recipient_id=recipient_id,
            title=title,
            message=message,
            notification_type=type,
            link_url=action_link
        )
        
        # 📧 Trigger Email Delivery
        if email:
            NotificationDispatcher.send_notification_email(
                email=email,
                title=title,
                message=message,
                action_link=action_link
            )
            
        import logging
        logging.getLogger(__name__).info(f"[NOTIF-DISPATCH] Success for {email or recipient_id} | Type: {type}")
        return notification

    @staticmethod
    def send_notification_email(email: str, title: str, message: str, action_link: str = ""):
        """
        Transmits the alert via SMTP.
        """
        from django.core.mail import send_mail
        from django.conf import settings
        
        full_message = f"{message}\n\nView Details: {settings.FRONTEND_URL}{action_link}"
        
        try:
            send_mail(
                subject=title,
                message=full_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[EMAIL-ERR] Failed to send to {email}: {str(e)}")

    @staticmethod
    def broadcast_to_group(
        target_group: str,
        title: str,
        content: str,
        drive_id: Optional[int] = None
    ):
        # Implementation for bulk announcements could go here
        pass

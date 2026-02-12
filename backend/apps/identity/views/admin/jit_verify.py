from django.conf import settings
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.response import Response
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, generate_jit_admin_ticket
import time

class VerifyAdminTicketView(generics.GenericAPIView):
    """
    Validation endpoint for JIT admin tickets.
    """
    def post(self, request, *args, **kwargs):
        ticket = request.data.get("ticket")
        if not ticket:
            return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid = verify_jit_admin_ticket(ticket)
        return Response({"valid": is_valid}, status=status.HTTP_200_OK if is_valid else status.HTTP_403_FORBIDDEN)


class RequestAdminAccessView(generics.GenericAPIView):
    """
    Publicly accessible endpoint that sends a JIT link to the root admin
    if the provided email matches the configured SUPER_ADMIN_EMAIL.
    Always returns a success message to prevent enumeration.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        email = request.data.get("email", "").strip().lower()
        target_email = settings.SUPER_ADMIN_EMAIL.lower()

        if email == target_email:
            ticket = generate_jit_admin_ticket()
            access_url = f"{settings.FRONTEND_URL}/auth/secure-gateway?ticket={ticket}"
            
            subject = "SECURITY: Dynamic Admin Gate Initialization"
            message = (
                f"A secure gateway request was initiated for AUIP Platform.\n\n"
                f"Your JIT access link is valid for 15 minutes and strictly one-time use:\n"
                f"{access_url}\n\n"
                f"Incident Report ID: {int(time.time())}\n"
                f"Auth Protocol: HMAC-SHA256-JIT"
            )
            
            try:
                import time
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [target_email],
                    fail_silently=False,
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to send admin recovery email: {e}")

        # Always return generic success
        return Response({
            "detail": "Request processed. If the certificate matches, check your root inbox."
        }, status=status.HTTP_200_OK)

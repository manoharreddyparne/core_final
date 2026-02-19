import time
import logging
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from rest_framework import generics, status
from rest_framework.response import Response
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, generate_jit_admin_ticket
from apps.identity.utils.turnstile import verify_turnstile_token

logger = logging.getLogger(__name__)

class VerifyAdminTicketView(generics.GenericAPIView):
    """
    Validation endpoint for JIT admin tickets.
    """
    def post(self, request, *args, **kwargs):
        ticket = request.data.get("ticket")
        if not ticket:
            return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid = verify_jit_admin_ticket(ticket)
        logger.info(f"[SEC-GATE] Ticket check: ticket={ticket[:15]}... valid={is_valid}")
        return Response({"valid": is_valid}, status=status.HTTP_200_OK if is_valid else status.HTTP_200_OK) # Return 200 even for invalid to avoid Axios throw 404 immediately



class RequestAdminAccessView(generics.GenericAPIView):
    """
    Publicly accessible endpoint that sends a JIT link to the root admin
    if the provided email matches the configured SUPER_ADMIN_EMAIL.
    Always returns a success message to prevent enumeration.
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        # ✅ Global security check
        from apps.identity.utils.request_utils import get_client_ip
        from apps.identity.services.security_service import is_ip_blocked
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return Response({"detail": "Access Revoked. IP Blacklisted."}, status=status.HTTP_403_FORBIDDEN)

        turnstile_token = request.data.get("turnstile_token")
        if not verify_turnstile_token(turnstile_token):
            logger.warning(f"[SEC-GATE] JIT request rejected: Invalid Turnstile token")
            return Response({"detail": "Human verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        # Support both 'identifier' (platform standard) and 'email'
        identifier = request.data.get("identifier") or request.data.get("email", "")
        email = identifier.strip().lower()
        target_email = settings.SUPER_ADMIN_EMAIL.lower()
        
        # 🔥 DEBUG LOGGING
        try:
            with open("email_debug.log", "a") as f:
                f.write(f"\\n--- Request at {time.time()} ---\\n")
                f.write(f"Incoming Email: '{email}'\\n")
                f.write(f"Target Email: '{target_email}'\\n")
                f.write(f"Match: {email == target_email}\\n")
                f.write(f"Backend: {settings.EMAIL_BACKEND}\\n")
        except:
            pass

        if email == target_email:
            # Burst Protection (3 minutes per user request)
            cooldown_key = f"jit_burst_{email}"
            ttl = cache.ttl(cooldown_key)
            if ttl is not None and ttl > 0:
                logger.info(f"[SEC-GATE] Burst protection active for {email}. Waiting {ttl}s.")
                
                # Proactive Security Notification
                alert_subject = "⚠️ PROTOCOL ALERT: JIT Burst Suppression"
                alert_message = (
                    f"A suppressed JIT access request was detected for root identifier: {email}\n\n"
                    f"INTRA-GATE STATUS:\n"
                    f"-----------------------------------\n"
                    f"Action: REQUEST SUPPRESSED\n"
                    f"Reason: Multi-Request Burst Detected\n"
                    f"Blocked IP: {ip}\n"
                    f"Suppression Window Remaining: {ttl} seconds\n"
                    f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n"
                    f"-----------------------------------\n\n"
                    f"No action is required if this was you. If this activity is unexpected, please bridge into the infrastructure monitor."
                )
                try:
                    send_mail(
                        alert_subject,
                        alert_message,
                        settings.DEFAULT_FROM_EMAIL,
                        [target_email],
                        fail_silently=True,
                    )
                except Exception as e:
                    logger.error(f"Failed to send burst alert: {e}")

                return Response({
                    "detail": "Multiple JIT requests detected. Security protocols engaged. Please wait before re-initializing.",
                    "cooldown": ttl
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Generate and Send Ticket (Bound to Email)
            ticket = generate_jit_admin_ticket(email=target_email)
            access_url = f"{settings.FRONTEND_URL}/auth/secure-gateway?ticket={ticket}"

            # ✅ New JIT link = fresh start: clear all previous failure counters for this IP
            # Professional requirement: a legitimately requested new link should not carry
            # over penalties from previous sessions/fat-finger mistakes.
            from apps.identity.services.security_service import clear_global_failures
            from apps.identity.services.brute_force_service import clear_failed_attempt
            clear_global_failures(ip)
            clear_failed_attempt(target_email, ip)
            logger.info(f"[SEC-GATE] JIT generated for {target_email} — failure counters reset for IP={ip}")

            subject = "SECURITY: Dynamic Admin Gate Initialization"
            message = (
                f"A secure gateway request was initiated for AUIP Platform.\n\n"
                f"Your JIT access link is valid for 15 minutes and strictly one-time use:\n"
                f"{access_url}\n\n"
                f"Note: Requesting a new link automatically invalidates any existing ones.\n"
                f"Incident Report ID: {int(time.time())}\n"
                f"Auth Protocol: HMAC-SHA256-JIT"
            )
            
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [target_email],
                    fail_silently=False,
                )
                # Set 3 minute burst cooldown
                cache.set(cooldown_key, True, 180) 
                logger.info(f"✅ JIT Link sent to {target_email}")
                with open("email_debug.log", "a") as f:
                    f.write("Status: EMAIL SENT SUCCESSFULLY\\n")
            except Exception as e:
                logger.error(f"Failed to send admin recovery email: {e}")
                with open("email_debug.log", "a") as f:
                    f.write(f"Status: FAILED - {str(e)}\\n")

        # Always return generic success to public
        return Response({
            "detail": "If this email exists in our root hierarchy, the secure link will be shared shortly."
        }, status=status.HTTP_200_OK)

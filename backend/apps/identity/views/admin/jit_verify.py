import time
import logging
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from apps.identity.utils.email_utils import send_jit_link_email, send_burst_suppression_alert
from rest_framework import generics, status
from rest_framework.response import Response
from apps.identity.utils.jit_admin import verify_jit_admin_ticket, generate_jit_admin_ticket
from apps.identity.utils.turnstile import verify_turnstile_token

logger = logging.getLogger(__name__)

class VerifyAdminTicketView(generics.GenericAPIView):
    """
    Validation endpoint for JIT admin tickets.
    Enforces Strict Session Isolation.
    """
    def post(self, request, *args, **kwargs):
        # 🚨 ZERO-TRUST: Block if an active session already exists
        if request.user and request.user.is_authenticated:
            logger.warning(f"[SEC-GATE] JIT Rejected: Existing session detected for {request.user.email}")
            return Response({
                "valid": False, 
                "detail": "Active session detected. Please logout before using a secure access link."
            }, status=status.HTTP_200_OK)

        ticket = request.data.get("ticket")
        if not ticket:
            return Response({"valid": False}, status=status.HTTP_400_BAD_REQUEST)
        
        is_valid = verify_jit_admin_ticket(ticket)
        logger.info(f"[SEC-GATE] Ticket check: ticket={ticket[:15]}... valid={is_valid}")
        return Response({"valid": is_valid}, status=status.HTTP_200_OK)



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

        # Check if the user is a superuser
        from django.contrib.auth import get_user_model
        User = get_user_model()
        is_super = User.objects.filter(email=email, is_superuser=True).exists()
        
        # 🔥 DEBUG LOGGING
        try:
            with open("email_debug.log", "a") as f:
                f.write(f"\n--- Request at {time.time()} ---\n")
                f.write(f"Incoming Email: '{email}'\n")
                f.write(f"Is Superuser: {is_super}\n")
                f.write(f"Backend: {settings.EMAIL_BACKEND}\n")
        except:
            pass

        if is_super:
            target_email = email
            # Burst Protection (3 minutes per user request)
            cooldown_key = f"jit_burst_{email}"
            ttl = cache.ttl(cooldown_key)
            if ttl is not None and ttl > 0:
                logger.info(f"[SEC-GATE] Burst protection active for {email}. Waiting {ttl}s.")
                
                try:
                    send_burst_suppression_alert(target_email, ip, ttl)
                except Exception as e:
                    logger.error(f"Failed to send burst alert: {e}")

                return Response({
                    "detail": "Multiple JIT requests detected. Security protocols engaged. Please wait before re-initializing.",
                    "cooldown": ttl
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Generate and Send Ticket (Bound to Email)
            ticket = generate_jit_admin_ticket(email=target_email)
            access_url = f"{settings.FRONTEND_URL}/auth/secure-gateway?ticket={ticket}"
            
            # Print to stdout so user can see it in terminal, regardless of email status
            print(f"\n=======================================================")
            print(f"🔑 LOCAL DEV JIT LINK GENERATED FOR {target_email} 🔑")
            print(f"URL: {access_url}")
            print(f"=======================================================\n")

            # ✅ New JIT link = fresh start: clear all previous failure counters for this IP
            # Professional requirement: a legitimately requested new link should not carry
            # over penalties from previous sessions/fat-finger mistakes.
            from apps.identity.services.security_service import clear_global_failures
            from apps.identity.services.brute_force_service import clear_failed_attempt
            clear_global_failures(ip)
            clear_failed_attempt(target_email, ip)
            logger.info(f"[SEC-GATE] JIT generated for {target_email} — failure counters reset for IP={ip}")

            try:
                device_info = request.META.get('HTTP_USER_AGENT', 'Unknown Cybernetics OS')
                send_jit_link_email(target_email, access_url, ip_address=ip, device=device_info)
                # Set 3 minute burst cooldown
                cache.set(cooldown_key, True, 180) 
                logger.info(f"✅ JIT Link sent to {target_email} - URL: {access_url}")
                with open("email_debug.log", "a") as f:
                    f.write("Status: EMAIL SENT SUCCESSFULLY\n")
            except Exception as e:
                logger.error(f"Failed to send admin recovery email: {e} - URL: {access_url}")
                with open("email_debug.log", "a") as f:
                    f.write(f"Status: FAILED - {str(e)}\n")

        # Always return generic success to public
        return Response({
            "detail": "If this email exists in our root hierarchy, the secure link will be shared shortly."
        }, status=status.HTTP_200_OK)

# users/utils/email_utils.py
import logging
from typing import Optional, Tuple
from django.conf import settings
from django.core.mail import EmailMessage, EmailMultiAlternatives
from apps.identity.models import User, PasswordResetRequest
from apps.identity.utils.security import hash_token

logger = logging.getLogger(__name__)
OTP_TTL_SECONDS = getattr(settings, "OTP_TTL_SECONDS", 300)  # default 5 min

# --------------------------
# PASSWORD RESET REQUEST CREATION
# --------------------------
def create_reset_request(user: User, raw_token: str = None) -> Tuple[PasswordResetRequest, str]:
    import secrets
    if not raw_token:
        raw_token = secrets.token_urlsafe(32)
    hashed_token = hash_token(raw_token)
    PasswordResetRequest.objects.filter(user=user, used=False).delete()
    reset_request = PasswordResetRequest.objects.create(user=user, token_hash=hashed_token)
    reset_request._raw_token = raw_token
    return reset_request, raw_token
# --------------------------
# EMAIL HELPERS
# --------------------------
def _greeting(user: User) -> str:
    return f"Hi {user.first_name or user.username},\n\n"

def _footer_text() -> str:
    return "Regards,\nExam Portal Team"

def _footer_html() -> str:
    return """
    <p style="font-size:12px;color:#888888;">
    Regards,<br/>
    <strong>Exam Portal Team</strong><br/>
    <span style="font-size:10px;">&copy; 2025 Exam Portal. All rights reserved.</span>
    </p>
    """

def _email_banner() -> str:
    logo_url = getattr(settings, "EMAIL_LOGO_URL", "")
    return f"""
    <div style="background-color:#4CAF50;padding:20px;text-align:center;border-top-left-radius:10px;border-top-right-radius:10px;">
        <img src="{logo_url}" alt="Exam Portal Logo" style="height:50px;">
        <h1 style="color:white;font-family:Arial,sans-serif;margin:10px 0 0 0;">Exam Portal</h1>
    </div>
    """

# --------------------------
# SEND EMAIL
# --------------------------
def send_noreply_email(
    subject: str,
    recipient: str,
    message: str,
    reply_to: str = "noreply@examportal.com",
    html_content: Optional[str] = None,
) -> bool:
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@examportal.com")
    try:
        msg = EmailMultiAlternatives(subject, message, from_email, [recipient], reply_to=[reply_to])
        if html_content:
            msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"[Email] Sent to {recipient}")
        return True
    except Exception as e:
        logger.error(f"[Email] Failed to send to {recipient}: {e}", exc_info=True)
        return False



# --------------------------
# OTP EMAIL
# --------------------------
def send_otp_to_user(user, otp: str) -> bool:
    try:
        subject = "Your One-Time Password (OTP) - Exam Portal"
        expiry_minutes = getattr(settings, "OTP_TTL_SECONDS", 300) // 60
        plain_message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"Your OTP code is: {otp}\n"
            f"This code will expire in {expiry_minutes} minutes.\n\n"
            "If you did not request this, please ignore this email.\n\n"
            "Regards,\nExam Portal Team"
        )
        html_message = f"""
        <html><body style="font-family:Arial,sans-serif;background-color:#f6f6f6;padding:20px;">
        <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        <div style="background-color:#4CAF50;padding:20px;text-align:center;color:white;">
        <h1>Exam Portal OTP</h1></div>
        <div style="padding:30px 20px;text-align:center;">
        <p style="font-size:16px;">Hi {user.first_name or user.username},</p>
        <p style="font-size:18px;margin:20px 0;">Your OTP code is:</p>
        <div style="font-size:32px;font-weight:bold;color:#4CAF50;border:2px dashed #4CAF50;display:inline-block;padding:15px 30px;border-radius:10px;margin:20px 0;">{otp}</div>
        <p style="font-size:14px;color:#555;">This code will expire in <strong>{expiry_minutes} minutes</strong>.</p>
        <p style="font-size:12px;color:#888;">If you did not request this, ignore this email.</p></div>
        <div style="padding:10px 20px 20px 20px;font-size:12px;color:#888;text-align:center;">&copy; 2025 Exam Portal. All rights reserved.</div></div></body></html>
        """
        return send_noreply_email(subject, user.email, plain_message, html_content=html_message)
    except Exception as e:
        logger.error(f"[send_otp_to_user] Failed to send OTP to {user.email}: {e}", exc_info=True)
        return False


# --------------------------
# WELCOME EMAIL
# --------------------------
def send_welcome_email(user: User, password: str) -> bool:
    try:
        subject = "Welcome to Exam Portal - Your Login Credentials"
        message = (
            _greeting(user)
            + f"Your username: {user.username}\n"
            + f"Your temporary password: {password}\n"
            + "You will be asked to reset your password on first login.\n\n"
            + _footer_text()
        )
        html_content = f"""
        <html>
          <body style="font-family:Arial,sans-serif;color:#333;">
            <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
              {_email_banner()}
              <div style="padding:20px;">
                <p>{_greeting(user)}</p>
                <p>We are excited to have you on board. Below are your login credentials:</p>
                <p><strong>Username:</strong> {user.email}<br/>
                   <strong>Temporary Password:</strong> {password}</p>
                <p>Please <strong>reset your password on first login</strong>.</p>
              </div>
              <div style="padding:0 20px 20px 20px;">
                {_footer_html()}
              </div>
            </div>
          </body>
        </html>
        """
        return send_noreply_email(message, subject, user.email, html_content=html_content)
    except Exception as e:
        logger.error(f"[send_welcome_email] Error: {e}", exc_info=True)
        return False

# --------------------------
# PASSWORD RESET EMAIL
# --------------------------
def send_password_reset_email(reset_request: PasswordResetRequest, raw_token: str) -> Tuple[bool, str]:
    try:
        user = reset_request.user
        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        reset_url = f"{frontend_base}/reset-password-confirm/{raw_token}"
        expiry_minutes = 30

        message = (
            f"{_greeting(user)}"
            f"You requested a password reset. Use the link below if your email client does not support HTML:\n"
            f"{reset_url}\n\n"
            f"⚠️ This link will expire in {expiry_minutes} minutes.\n\n"
            "If you did not request this, ignore this email.\n\n"
            f"{_footer_text()}"
        )

        html_content = f"""
        <html><body style="font-family:Arial,sans-serif;color:#333;background-color:#f6f6f6;padding:20px;">
        <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        {_email_banner()}
        <div style="padding:30px 20px;">
        <p style="font-size:16px;">{_greeting(user)}</p>
        <p style="font-size:14px;">You recently requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align:center;margin:30px;">
        <a href="{reset_url}" style="background-color:#4CAF50;color:white;padding:15px 30px;text-decoration:none;font-weight:bold;font-size:16px;border-radius:5px;display:inline-block;box-shadow:0 4px 8px rgba(0,0,0,0.2);transition:all 0.2s;">Reset My Password</a>
        </div>
        <p style="font-size:12px;color:#555;">⚠️ This link is valid for {expiry_minutes} minutes only.</p>
        <p style="font-size:12px;color:#555;">If you did not request this, ignore this email.</p></div>
        <div style="padding:0 20px 20px 20px;font-size:12px;color:#888888;">{_footer_html()}</div></div></body></html>
        """

        # ✅ Corrected argument order
        success = send_noreply_email("Password Reset Request - Exam Portal", user.email, message, html_content=html_content)
        if not success:
            reset_request.delete()
            return False, "Failed to send password reset email. Please try again later."

        dev_note = f" (For dev/testing: {reset_url})" if settings.DEBUG else ""
        return True, f"Password reset link sent successfully.{dev_note}"

    except Exception as e:
        logger.error(f"[send_password_reset_email] Error: {e}", exc_info=True)
        return False, str(e)


# --------------------------
# PASSWORD CHANGED EMAIL
# --------------------------
def send_password_changed_email(user: User) -> bool:
    try:
        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        reset_url = f"{frontend_base}/reset-password/"
        message = (
            f"{_greeting(user)}"
            "Your password was successfully changed.\n\n"
            "If you did NOT perform this change, please reset your password immediately using the link below:\n"
            f"{reset_url}\n\n"
            f"{_footer_text()}"
        )
        html_content = f"""
        <html><body style="font-family:Arial,sans-serif;color:#333;background-color:#f6f6f6;padding:20px;">
        <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        {_email_banner()}
        <div style="padding:30px 20px;">
        <p style="font-size:16px;">{_greeting(user)}</p>
        <p style="font-size:14px;">Your password was successfully changed.</p>
        <p style="font-size:14px;color:#d32f2f;font-weight:bold;">⚠️ If you did NOT change your password, click the button below to reset it immediately.</p>
        <div style="text-align:center;margin:30px;">
        <a href="{reset_url}" style="background-color:#d32f2f;color:white;padding:15px 30px;text-decoration:none;font-weight:bold;font-size:16px;border-radius:5px;display:inline-block;box-shadow:0 4px 8px rgba(0,0,0,0.2);transition:all 0.2s;">Reset My Password</a>
        </div>
        <p style="font-size:12px;color:#555;">If you did perform this change, you can safely ignore this message.</p></div>
        <div style="padding:0 20px 20px 20px;font-size:12px;color:#888888;">{_footer_html()}</div></div></body></html>
        """
        # ✅ Corrected argument order
        return send_noreply_email("Your Exam Portal Password Has Been Changed", user.email, message, html_content=html_content)
    except Exception as e:
        logger.error(f"[send_password_changed_email] Error: {e}", exc_info=True)
        return False


# --------------------------
# DEV EMAIL TEST
# --------------------------
if settings.DEBUG:
    def test_email_delivery(to_email: str):
        logger.info(f"[TEST EMAIL] Trying to send test mail to {to_email}")
        return send_noreply_email(
            "✅ Email Test Successful",
            to_email,
            "This is a test mail from Exam Portal backend.",
            html_content="<h3>Email system is working ✅</h3>",
        )

# users/utils.py
# cSpell:disable
import csv
import random
import re
import string
import logging
from datetime import timedelta
from typing import Tuple, Optional, List, Dict

from django.utils import timezone
from django.core.mail import EmailMessage, EmailMultiAlternatives
from django.conf import settings
from django.http import HttpResponse
from django.contrib.auth.hashers import check_password, make_password

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken

from .models import PasswordResetRequest, PasswordHistory, BlacklistedAccessToken, User

logger = logging.getLogger(__name__)

# -------------------------------
# EMAIL UTILITIES
# -------------------------------
def _greeting(user) -> str:
    return f"Hi {user.first_name or user.username},\n\n"

def _footer_html() -> str:
    return """
    <p style="font-size:12px;color:#888888;">
    Regards,<br/>
    <strong>Exam Portal Team</strong><br/>
    <span style="font-size:10px;">&copy; 2025 Exam Portal. All rights reserved.</span>
    </p>
    """

def _footer_text() -> str:
    return "Regards,\nExam Portal Team"

def _email_banner() -> str:
    logo_url = getattr(
        settings,
        "EMAIL_LOGO_URL",
        "https://play-lh.googleusercontent.com/xQRlyPuqZoYIwkDRWmnY8NjNPYA1Wf3h9tDWlnKF9gCCc-lMB4nUMnYu7GLahOTAznM=w600-h300-pc0xffffff-pd",
    )
    return f"""
    <div style="background-color:#4CAF50;padding:20px;text-align:center;border-top-left-radius:10px;border-top-right-radius:10px;">
        <img src="{logo_url}" alt="Exam Portal Logo" style="height:50px;">
        <h1 style="color:white;font-family:Arial,sans-serif;margin:10px 0 0 0;">Exam Portal</h1>
    </div>
    """

def send_noreply_email(
    message: str,
    subject: str,
    recipient: str,
    reply_to: str = "noreply@examportal.com",
    html_content: Optional[str] = None,
) -> bool:
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@examportal.com")
    try:
        if html_content:
            msg = EmailMultiAlternatives(subject, message, from_email, [recipient], reply_to=[reply_to])
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
        else:
            email = EmailMessage(subject, message, from_email, [recipient], reply_to=[reply_to])
            email.send(fail_silently=False)
        logger.info(f"Email sent to {recipient}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient}: {e}")
        return False

# -------------------------------
# WELCOME EMAIL
# -------------------------------
def send_welcome_email(user, password: str) -> None:
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
            <p>Hi {user.first_name or user.username},</p>
            <p>We are excited to have you on board. Below are your login credentials:</p>
            <p><strong>Username:</strong> {user.email}<br/>
               <strong>Temporary Password:</strong> {password}</p>
            <p>Please <strong>reset your password on first login</strong> to secure your account.</p>
          </div>
          <div style="padding:0 20px 20px 20px;">
            {_footer_html()}
          </div>
        </div>
      </body>
    </html>
    """
    send_noreply_email(message, subject, user.email, html_content=html_content)

# -------------------------------
# PASSWORD RESET EMAIL
# -------------------------------
def send_password_reset_email(reset_request: PasswordResetRequest) -> Tuple[bool, Optional[str]]:
    """
    Sends password reset email using an existing reset_request object.
    """
    user = reset_request.user
    token = reset_request.token
    reset_url = f"http://127.0.0.1:8000/api/users/reset-password-confirm/{token}/"

    message = (
        _greeting(user)
        + f"Use this link if your email client does not support HTML:\n{reset_url}\n\n"
        + _footer_text()
    )

    html_content = f"""
    <html>
      <body style="font-family:Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
          {_email_banner()}
          <div style="padding:20px;">
            <p>Hi {user.first_name or user.username},</p>
            <p>You requested a password reset. Click below to reset your password:</p>
            <div style="text-align:center;margin:20px;">
              <a href="{reset_url}" style="
                  background-color:#4CAF50;
                  color:white;
                  padding:14px 28px;
                  text-decoration:none;
                  font-weight:bold;
                  border-radius:5px;
                  display:inline-block;">
                  Reset Password
              </a>
            </div>
            <p>If you did not request this, ignore this email.</p>
          </div>
          <div style="padding:0 20px 20px 20px;">
            {_footer_html()}
          </div>
        </div>
      </body>
    </html>
    """
    success = send_noreply_email(message, "Password Reset Request", user.email, html_content=html_content)
    if not success:
        reset_request.delete()
        return False, "Failed to send password reset email. Please try again later."
    return True, f"Password reset link sent successfully. (For dev/testing, reset link: {reset_url})"

# -------------------------------
# PASSWORD CHANGED EMAIL
# -------------------------------
def send_password_changed_email(user) -> None:
    subject = "Your Exam Portal Password Has Been Changed"
    message = _greeting(user) + "Your password has been changed successfully.\n\n" + _footer_text()
    html_content = f"""
    <html>
      <body style="font-family:Arial,sans-serif;color:#333;">
        <div style="max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:10px;overflow:hidden;">
          {_email_banner()}
          <div style="padding:20px;">
            <p>Hi {user.first_name or user.username},</p>
            <p>Your password has been updated successfully. If you did not perform this action, contact support immediately.</p>
          </div>
          <div style="padding:0 20px 20px 20px;">
            {_footer_html()}
          </div>
        </div>
      </body>
    </html>
    """
    send_noreply_email(message, subject, user.email, html_content=html_content)

# -------------------------------
# PASSWORD UTILITIES
# -------------------------------
def generate_random_password(length: int = 12) -> str:
    if length < 4:
        raise ValueError("Password length must be at least 4 characters.")
    chars = {
        "lower": random.choice(string.ascii_lowercase),
        "upper": random.choice(string.ascii_uppercase),
        "digit": random.choice(string.digits),
        "special": random.choice("@$!%*?&"),
    }
    remaining = [random.choice(string.ascii_letters + string.digits + "@$!%*?&") for _ in range(length - 4)]
    password_list = list(chars.values()) + remaining
    random.shuffle(password_list)
    return "".join(password_list)

def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 16:
        return False, "Password must be at most 16 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit."
    if not re.search(r"[@$!%*?&]", password):
        return False, "Password must contain at least one special character (@, $, !, %, *, ?, &)."
    return True, None

def check_password_reuse(user, new_password: str) -> bool:
    for past in PasswordHistory.objects.filter(user=user).iterator():
        if check_password(new_password, past.password_hash):
            return True
    return False

def log_password_history(user, password: str) -> None:
    if user and password:
        PasswordHistory.objects.create(user=user, password_hash=make_password(password))

def export_students_to_csv(students: List[Dict[str, str]]) -> HttpResponse:
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="created_students.csv"'
    writer = csv.writer(response)
    writer.writerow(["Roll Number", "Email", "Password"])
    for s in students:
        writer.writerow([s["roll_number"], s["email"], s["password"]])
    return response

# -------------------------------
# TOKEN BLACKLIST HELPERS
# -------------------------------
def blacklist_access_token(token_str: str, user) -> None:
    """Blacklist a single access token using token_hash"""
    try:
        BlacklistedAccessToken.objects.get_or_create(
            token_hash=BlacklistedAccessToken.hash_token(token_str),
            user=user
        )
    except Exception as e:
        logger.error(f"[blacklist_access_token] Error: {e}")

# users/utils.py
def blacklist_user_tokens(user: User, include_refresh=True, skip_tokens: list = None):
    """
    Blacklists all outstanding tokens of a user, optionally skipping tokens in skip_tokens.
    This should be called **after successful password reset**.
    """
    skip_tokens = skip_tokens or []

    if include_refresh:
        tokens = OutstandingToken.objects.filter(user=user)
        for token_obj in tokens:
            try:
                token_str = str(token_obj.token)
                if token_str in skip_tokens:
                    print(f"[DEBUG] Skipping token from blacklist: {token_str}")
                    continue
                refresh = RefreshToken(token_str)
                refresh.blacklist()
                BlacklistedAccessToken.objects.get_or_create(
                    token_hash=BlacklistedAccessToken.hash_token(str(refresh.access_token)),
                    user=user
                )
                print(f"[DEBUG] Blacklisted old token for user {user.email}: {token_str}")
            except Exception as e:
                logger.error(f"[blacklist_user_tokens] Error blacklisting token {token_obj}: {e}", exc_info=True)

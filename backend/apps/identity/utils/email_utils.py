# users/utils/email_utils.py
import logging
import time
from typing import Optional, Tuple
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from apps.identity.models import User, PasswordResetRequest
from apps.identity.utils.security import hash_token

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------------------
# PREMIUM EMAIL DESIGN SYSTEM
# ------------------------------------------------------------------------------

PRIMARY_COLOR = "#4f46e5"  # Indigo-600
BG_LIGHT = "#f8fafc"       # Slate-50
SURFACE_LIGHT = "#ffffff"  # White
TEXT_MAIN = "#334155"      # Slate-700
TEXT_MUTED = "#64748b"     # Slate-500
BORDER_COLOR = "#e2e8f0"   # Slate-200

def _get_base_template(content_html: str, title: str) -> str:
    """Centralized high-fidelity HTML wrapper."""
    app_name = getattr(settings, "VITE_APP_NAME", "Nexora")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: {BG_LIGHT}; color: {TEXT_MAIN}; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: {SURFACE_LIGHT}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid {BORDER_COLOR}; }}
            .header {{ background-color: {PRIMARY_COLOR}; padding: 30px 20px; text-align: center; }}
            .header-title {{ font-size: 24px; font-weight: 700; color: #ffffff; margin: 0; letter-spacing: -0.025em; }}
            .content {{ padding: 40px; line-height: 1.6; }}
            .h1 {{ font-size: 20px; font-weight: 600; margin: 0 0 16px 0; color: #0f172a; text-align: center; }}
            .p {{ font-size: 16px; color: {TEXT_MAIN}; margin-bottom: 24px; text-align: center; }}
            .btn {{ display: inline-block; padding: 12px 28px; background-color: {PRIMARY_COLOR}; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: background-color 0.2s; }}
            .footer {{ background-color: #f1f5f9; padding: 24px; text-align: center; font-size: 13px; color: {TEXT_MUTED}; border-top: 1px solid {BORDER_COLOR}; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 16px; background: #e0e7ff; color: {PRIMARY_COLOR}; font-size: 12px; font-weight: 600; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }}
            .info-box {{ background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid {BORDER_COLOR}; border-left: 4px solid {PRIMARY_COLOR}; }}
            .code-box {{ background: #f1f5f9; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center; border: 1px solid {BORDER_COLOR}; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="header-title">{app_name}</div>
            </div>
            <div class="content">
                {content_html}
            </div>
            <div class="footer">
                <p style="margin: 0 0 8px 0;">&copy; {time.strftime('%Y')} {app_name}. All rights reserved.</p>
                <p style="margin: 0;">This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """

# ------------------------------------------------------------------------------
# CORE EMAIL FUNCTIONS
# ------------------------------------------------------------------------------

def send_premium_email(subject: str, recipient: str, plain_text: str, html_content: str):
    """Utility to send the final engineered email."""
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@auip.io")
    msg = EmailMultiAlternatives(subject, plain_text, from_email, [recipient])
    msg.attach_alternative(html_content, "text/html")
    try:
        msg.send()
        logger.info(f"✅ Premium email dispatched to {recipient} [{subject}]")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to dispatch email to {recipient}: {e}")
        return False

def _parse_user_agent(ua_string: str) -> str:
    """Simple parser to turn raw UA strings into human-readable titles."""
    ua = ua_string.lower()
    os = "Unknown OS"
    if "windows" in ua: os = "Windows"
    elif "macintosh" in ua or "mac os" in ua: os = "macOS"
    elif "iphone" in ua: os = "iPhone"
    elif "android" in ua: os = "Android"
    elif "linux" in ua: os = "Linux"

    browser = "Browser"
    if "chrome" in ua and "edg/" not in ua: browser = "Chrome"
    elif "safari" in ua and "chrome" not in ua: browser = "Safari"
    elif "firefox" in ua: browser = "Firefox"
    elif "edg/" in ua: browser = "Edge"
    
    return f"{browser} on {os}"

def send_jit_link_email(email: str, access_url: str, ip_address: str = "Unknown", device: str = "Unknown"):
    """Specific template for Super Admin JIT access."""
    subject = "Admin Access Request - Nexora"
    readable_device = _parse_user_agent(device)
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge">Security Alert</div>
            <h1 class="h1">Admin Access Requested</h1>
            <p class="p">A request was made to access the system as an administrator. Use the secure link below to proceed with your login.</p>
            
            <div class="info-box" style="text-align: left;">
                <div style="color: #0f172a; font-weight: 600; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid {BORDER_COLOR}; padding-bottom: 8px;">REQUEST DETAILS</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: {TEXT_MAIN};">
                    <tr><td style="padding: 8px 0; font-weight: 500; width: 40%;">Expires In:</td><td style="text-align: right; color: {TEXT_MUTED};">15 Minutes</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 500;">Origin IP:</td><td style="text-align: right; color: {TEXT_MUTED}; font-family: monospace;">{ip_address}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 500;">Device:</td><td style="text-align: right; color: {TEXT_MUTED};">{readable_device}</td></tr>
                </table>
            </div>

            <div style="margin-top: 32px;">
                <a href="{access_url}" class="btn">Login as Administrator</a>
            </div>
            
            <p style="font-size: 13px; color: {TEXT_MUTED}; margin-top: 32px; text-align: center;">
                If you did not request this access, please ignore this email or contact the security team immediately.
            </p>
        </div>
    """, "Admin Access")
    
    plain = f"Nexora Admin Access Request\\n\\nYour access link: {access_url}\\nValid for 15 minutes."
    return send_premium_email(subject, email, plain, html)

def send_otp_to_user(user, otp: str):
    """Premium OTP delivery optimized for mobile auto-fill."""
    # Explicit subject line helps mobile OS (iOS/macOS) pick up the code
    subject = f"{otp} is your Nexora security code"
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge" style="background: #fee2e2; color: #dc2626;">Security Handshake</div>
            <h1 class="h1">Authentication Token</h1>
            <p class="p">A secure access attempt requires verification. Please enter the following 6-digit code into the gateway.</p>
            
            <div class="code-box" style="border: 2px dashed #e2e8f0; background: #ffffff; padding: 32px;">
                <div style="font-size: 48px; letter-spacing: 16px; font-weight: 800; color: #dc2626; margin-left: 16px; font-family: monospace;">{otp}</div>
            </div>
            
            <p class="p" style="font-size: 13px; color: {TEXT_MUTED}; margin-top: 24px;">
                This code is time-sensitive and will expire in <strong style="color: #0f172a;">5 minutes</strong>.<br>
                For your security, never share this code with anyone.
            </p>
        </div>
    """, "Identity Verification")
    
    # Plain text format is also parsed by some OSs
    plain = f"Your Nexora Security Code: {otp}"
    return send_premium_email(subject, user.email, plain, html)

def send_welcome_email(user, password):
    """Onboarding premium experience."""
    subject = "Welcome to Nexora"
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge">Welcome</div>
            <h1 class="h1">Welcome, {user.first_name or user.username}</h1>
            <p class="p">Your account has been successfully created. You can now log in to the Nexora.</p>
            
            <div class="info-box" style="text-align: left;">
                <div style="color: #0f172a; font-weight: 600; margin-bottom: 8px;">Your Credentials</div>
                <div style="font-size: 14px; color: {TEXT_MAIN};">
                    <span style="font-weight: 500;">Username:</span> {user.email}<br><br>
                    <span style="font-weight: 500;">Temporary Password:</span> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a;">{password}</code>
                </div>
            </div>

            <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/auth/login" class="btn">Log In to Nexora</a>
        </div>
    """, "Welcome")
    
    plain = f"Welcome! Link: {getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/auth/login"
    return send_premium_email(subject, user.email, plain, html)

def send_password_reset_email(reset_request, raw_token):
    """Security recovery template."""
    user = reset_request.user
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_base}/auth/reset-password-confirm/{raw_token}"
    
    subject = "Password Reset Request"
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge">Password Reset</div>
            <h1 class="h1">Reset your password</h1>
            <p class="p">We received a request to reset the password for your account. Click the button below to choose a new password.</p>
            
            <a href="{reset_url}" class="btn">Reset Password</a>
            
            <div style="margin-top: 32px; padding: 16px; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; text-align: left;">
                <span style="color: #dc2626; font-size: 13px; font-weight: 500;">Note: This link expires in 30 minutes. If you did not request a password reset, you can safely ignore this email.</span>
            </div>
        </div>
    """, "Password Recovery")
    
    plain = f"Password reset: {reset_url}"
    return send_premium_email(subject, user.email, plain, html)

def send_password_changed_email(user):
    """Audit notification."""
    subject = "Security Alert: Password Changed"
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge">Security Alert</div>
            <h1 class="h1">Your password was changed</h1>
            <p class="p">The password for your account was recently changed. If you made this change, you don't need to do anything.</p>
            
            <div class="info-box" style="border-left-color: #dc2626; background: #fef2f2; border-color: #fecaca; text-align: left;">
                <div style="color: #991b1b; font-weight: 600; font-size: 14px;">Didn't make this change?</div>
                <p style="font-size: 14px; color: #b91c1c; margin: 8px 0 0 0;">If you didn't change your password, your account might be compromised. Please secure your account immediately.</p>
            </div>

            <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/auth/reset-password" class="btn" style="background-color: #dc2626; margin-top: 16px;">Secure My Account</a>
        </div>
    """, "Security Alert")
    
    plain = f"Password changed for {user.email}"
    return send_premium_email(subject, user.email, plain, html)


def send_burst_suppression_alert(email: str, ip_address: str, cooldown_seconds: int):
    """Notify the user about suppressed login attempts."""
    subject = "Security Alert: Access Request Suppressed"
    
    html = _get_base_template(f"""
        <div style="text-align: center;">
            <div class="badge">Security Alert</div>
            <h1 class="h1">Multiple Access Requests</h1>
            <p class="p">Our system has detected multiple administrative access requests in a short period. For your protection, additional requests have been temporarily suppressed.</p>
            
            <div class="info-box" style="text-align: left;">
                <div style="color: #0f172a; font-weight: 600; margin-bottom: 12px; font-size: 14px; border-bottom: 1px solid {BORDER_COLOR}; padding-bottom: 8px;">SECURITY STATUS</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: {TEXT_MAIN};">
                    <tr><td style="padding: 8px 0; font-weight: 500; width: 45%;">Origin IP:</td><td style="text-align: right; color: {TEXT_MUTED}; font-family: monospace;">{ip_address}</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 500;">Suppression:</td><td style="text-align: right; color: #dc2626; font-weight: 600;">Active</td></tr>
                    <tr><td style="padding: 8px 0; font-weight: 500;">Time remaining:</td><td style="text-align: right; color: {TEXT_MUTED};">{cooldown_seconds} seconds</td></tr>
                </table>
            </div>

            <p style="font-size: 13px; color: {TEXT_MUTED}; margin-top: 32px; text-align: left;">
                No action is required if this was you. Simply wait for the suppression window to expire before requesting a new link.
                <strong>If you did not authorize this activity, please check your account security.</strong>
            </p>
        </div>
    """, "Security Alert")
    
    plain = f"Security Alert: Multiple access requests detected from {ip_address}. Suppression active for {cooldown_seconds}s."
    return send_premium_email(subject, email, plain, html)


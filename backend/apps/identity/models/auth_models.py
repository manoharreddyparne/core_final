# users/models/auth_models.py

import logging
from django.conf import settings
from django.db import models
from django.utils import timezone
from apps.identity.utils.security import hash_token, hash_token_secure
logger = logging.getLogger(__name__)


# --------------------------
# Blacklisted Access Token
# --------------------------
class BlacklistedAccessToken(models.Model):
    """
    Tracks invalidated JWT access tokens.
    Token is stored as HMAC hash using centralized security.py.
    Includes optional jti and expires_at for proper session tracking.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="blacklisted_tokens",
    )
    token_hash = models.CharField(max_length=128)
    jti = models.CharField(max_length=255, blank=True, null=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=["token_hash"]),
            models.Index(fields=["user", "expires_at"]),
            models.Index(fields=["jti"]),
        ]
        unique_together = ("user", "token_hash")

    @classmethod
    def blacklist(cls, token: str, user, jti: str = None, expires_at: timezone = None):
        token_hash_value = hash_token(token)
        obj, created = cls.objects.get_or_create(
            user=user,
            token_hash=token_hash_value,
            defaults={"jti": jti, "expires_at": expires_at},
        )
        if created:
            logger.info(f"Token blacklisted for user={user.email}, jti={jti}")
        else:
            logger.debug(f"Token already blacklisted for user={user.email}, jti={jti}")
        return obj

    @classmethod
    def is_blacklisted(cls, token: str, user=None) -> bool:
        token_hash_value = hash_token(token)
        qs = cls.objects.filter(token_hash=token_hash_value)
        if user:
            qs = qs.filter(user=user)
        return qs.exists()

    def __str__(self):
        return f"Token for {self.user.email} blacklisted at {self.blacklisted_at}"


# --------------------------
# Login Session
# --------------------------
class LoginSession(models.Model):
    """
    Tracks user login sessions with full device & location info.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="login_sessions",
    )
    jti = models.CharField(max_length=255, unique=True)
    token_hash = models.CharField(max_length=128)
    refresh_jti = models.CharField(max_length=255, blank=True, null=True)
    refresh_token_hash = models.CharField(max_length=128, blank=True, null=True)

    device_fingerprint = models.CharField(max_length=128, blank=True, db_index=True)
    device_salt = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    device = models.CharField(max_length=255, blank=True)
    device_type = models.CharField(max_length=32, blank=True)  # mobile / desktop / tablet
    browser_info = models.CharField(max_length=128, blank=True)
    login_method = models.CharField(max_length=32, default="web")  # web / mobile / api

    ip_address = models.GenericIPAddressField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    last_seen_location = models.JSONField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user","refresh_jti","is_active"]),
            models.Index(fields=["expires_at"]),
            models.Index(fields=["device_fingerprint"]),
            models.Index(fields=["refresh_token_hash"]),
            models.Index(fields=["device_salt"]),
        ]
        ordering = ["-created_at"]

    def deactivate(self):
        if self.is_active:
            self.is_active = False
            self.save(update_fields=["is_active"])
            logger.info(f"Login session deactivated: jti={self.jti}, user={self.user.email}")

    def is_expired(self):
        return self.expires_at and self.expires_at <= timezone.now()

    def deactivate_if_expired(self):
        if self.is_expired() and self.is_active:
            self.deactivate()

    def update_last_active(self, location=None, min_interval_sec=60):
        now = timezone.now()
        if (now - self.last_active).total_seconds() < min_interval_sec:
            return  # skip frequent updates
        self.last_active = now
        self.last_seen_at = now
        if location:
            self.last_seen_location = location
        self.save(update_fields=["last_active", "last_seen_at", "last_seen_location"])

    @classmethod
    def create_session(
        cls,
        user,
        jti: str,
        token_str: str,
        refresh_jti: str = None,
        refresh_token_str: str = None,
        device_fingerprint: str = "",
        device: str = "",
        device_type: str = "",
        browser_info: str = "",
        login_method: str = "web",
        ip_address: str = None,
        user_agent: str = "",
        expires_at: timezone = None,
        device_salt: str = None,
    ):
        token_hash_value = hash_token_secure(token_str)
        refresh_hash_value = hash_token_secure(refresh_token_str) if refresh_token_str else None
        session = cls.objects.create(
            user=user,
            jti=jti,
            token_hash=token_hash_value,
            refresh_jti=refresh_jti,
            refresh_token_hash=refresh_hash_value,
            device_fingerprint=device_fingerprint,
            device=device,
            device_type=device_type,
            browser_info=browser_info,
            login_method=login_method,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=expires_at,
            device_salt=device_salt,
        )
        logger.info(f"[SESSION] Created: jti={jti} user={user.email} id={session.id}")
        return session

    def __str__(self):
        return f"Session {self.jti} for {self.user.email} (Active: {self.is_active})"

    @staticmethod
    def make_device_salt():
        """Helper to generate random salt for fingerprinting."""
        import secrets
        return secrets.token_hex(16)  # 32-character hex string


# --------------------------
# Remembered Device for Adaptive 2FA
# --------------------------
class RememberedDevice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="remembered_devices"
    )
    device_hash = models.CharField(max_length=128, unique=True)
    trusted = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)
    # Device and Location Info
    ip_address = models.GenericIPAddressField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    device = models.CharField(max_length=50, blank=True, default="web")
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Remembered Device"
        verbose_name_plural = "Remembered Devices"

    def __str__(self):
        return f"{self.user.email} - {'Trusted' if self.trusted else 'Untrusted'}"

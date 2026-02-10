# users/constants.py

# -------------------------------
# General Defaults
# -------------------------------
DEFAULT_IP = "0.0.0.0"
DEFAULT_USER_AGENT = "unknown"

# -------------------------------
# Login / Brute-force
# -------------------------------
MAX_FAILED_ATTEMPTS = 5
COOLDOWN_SECONDS = 60  # Seconds to block after max attempts
LOCKOUT_MINUTES = 5
LOGIN_COOLDOWN_SECONDS = COOLDOWN_SECONDS
# -------------------------------
# OTP / Security
# -------------------------------
OTP_TTL_SECONDS = 300  # 5 minutes
CACHE_KEY_SALT = "my_secret_salt"  # can use settings.SECRET_KEY in runtime

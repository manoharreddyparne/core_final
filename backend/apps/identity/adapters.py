import logging
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


class GoogleJWTAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter for Google OAuth login.
    Enforces login only for existing users.
    Prevents automatic user creation.
    """

    def pre_social_login(self, request, sociallogin):
        """
        Called after successful OAuth2 login but before completing the login.

        1. Checks if a user exists with the given Google email.
        2. If not, raises AuthenticationFailed (blocks login).
        3. Attaches the existing user to sociallogin to continue the login flow.
        """
        email = (getattr(sociallogin.user, "email", "") or "").lower()
        if not email:
            logger.warning("Google login failed: No email returned from provider")
            raise AuthenticationFailed(
                "Google account has no email. Cannot login."
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning(f"Google login failed: No account exists with email {email}")
            raise AuthenticationFailed(
                "No account exists with this email. Please contact the admin to create an account."
            )

        # Attach existing user to the sociallogin object
        sociallogin.user = user
        sociallogin.state['process'] = 'login'
        sociallogin.is_existing = True

        logger.info(f"Google login successful for existing user: {email}")

#cSpell: disable
from django.urls import path
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import logging
from rest_framework import permissions

logger = logging.getLogger(__name__)
User = get_user_model()

class GoogleLogin(SocialLoginView):
    """
    Google OAuth2 login endpoint using dj-rest-auth and allauth.
    Only allows login for users already created by the admin.
    """
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        logger.info(f"Google login attempt from IP: {request.META.get('REMOTE_ADDR')}")
        return super().post(request, *args, **kwargs)

    def get_social_login(self, request, *args, **kwargs):
        """
        Override to prevent automatic account creation.
        Only allow existing users to login via Google.
        """
        sociallogin = super().get_social_login(request, *args, **kwargs)
        email = sociallogin.user.email

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            logger.warning(f"Google login failed: No user exists with email {email}")
            raise AuthenticationFailed(
                "No account exists with this email. Please contact admin."
            )

        # Attach existing user to sociallogin to avoid auto-creation
        sociallogin.user = user
        return sociallogin


urlpatterns = [
    path("google/", GoogleLogin.as_view(), name="google_login"),
]

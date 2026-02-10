from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from users.adapters import GoogleJWTAdapter
from .base import BaseSocialLoginView

class GoogleOAuthLoginView(BaseSocialLoginView):
    """Google OAuth2 login for existing users, enforces first-time password reset."""

    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client

    def get_adapter(self):
        return GoogleJWTAdapter()

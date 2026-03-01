from django.urls import path
from .views import LandingContentView

urlpatterns = [
    path("site-config/", LandingContentView.as_view(), name="site-config"),
]

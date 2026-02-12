from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Client
from .serializers import InstitutionPublicSerializer

class InstitutionListView(generics.ListAPIView):
    """
    Public API to list all registered institutions.
    Used by the frontend selector to let users choose their context.
    """
    queryset = Client.objects.exclude(schema_name='public') # Don't show public tenant
    serializer_class = InstitutionPublicSerializer
    permission_classes = [AllowAny]

from rest_framework import viewsets, permissions
from .models import SupportTicket
from .serializers import SupportTicketSerializer
from apps.auip_institution.authentication import TenantAuthentication
from apps.identity.authentication import SafeJWTAuthentication

class SupportViewSet(viewsets.ModelViewSet):
    """
    Automated self-healing support system.
    """
    authentication_classes = [TenantAuthentication, SafeJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    queryset = SupportTicket.objects.all().order_by('-created_at')
    serializer_class = SupportTicketSerializer

    def perform_create(self, serializer):
        ticket = serializer.save()
        from apps.core_brain.services import SelfHealingSupportService
        SelfHealingSupportService.auto_diagnose(ticket.id)

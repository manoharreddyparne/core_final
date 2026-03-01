from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.identity.models.institution import Institution
from rest_framework import serializers


class InstitutionListSerializer(serializers.ModelSerializer):
    """
    Public-facing institution list.
    Returns enough info for the directory + certificate verification links.
    No sensitive data exposed (no private keys, no internal DB IDs beyond pk).
    """
    class Meta:
        model = Institution
        fields = [
            # Core
            'id', 'name', 'slug', 'domain', 'contact_email', 'status',
            # Approval (Provisional) Certificate
            'certificate_id',
            'certificate_issued_at',
            'certificate_expires_at',
            # Activation (Sovereign) Certificate
            'activation_cert_id',
            'activation_cert_issued_at',
            'activation_cert_expires_at',
        ]


class PublicInstitutionListView(APIView):
    """
    Public endpoint — returns all APPROVED institutions with their certificate metadata.
    Used by:
      - Login page institution dropdown
      - Landing page Institution Directory section
    """
    permission_classes = [AllowAny]

    def get(self, request):
        institutions = Institution.objects.filter(
            status=Institution.RegistrationStatus.APPROVED
        ).order_by('name')
        serializer = InstitutionListSerializer(institutions, many=True)
        return Response(serializer.data)

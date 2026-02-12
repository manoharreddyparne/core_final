from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from apps.identity.models.institution import Institution
from rest_framework import serializers

class InstitutionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Institution
        fields = ['id', 'name', 'slug', 'domain']

class PublicInstitutionListView(APIView):
    """
    Returns a list of approved institutions for the login dropdown.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        institutions = Institution.objects.filter(status=Institution.RegistrationStatus.APPROVED)
        serializer = InstitutionListSerializer(institutions, many=True)
        return Response(serializer.data)

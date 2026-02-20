from rest_framework import serializers
from apps.identity.models.interest import InstitutionInterest

class InstitutionInterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionInterest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'is_reviewed', 'admin_notes']

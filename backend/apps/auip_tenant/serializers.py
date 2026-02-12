from rest_framework import serializers
from .models import Client

class InstitutionPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ['id', 'name', 'schema_name', 'created_on']

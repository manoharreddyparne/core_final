from rest_framework import serializers
from apps.auip_tenant.models import Client
from apps.auip_institution.models import PreSeededRegistry, AuthorizedAccount
from django_tenants.utils import schema_context
from django.shortcuts import get_object_or_404

class IdentityCheckSerializer(serializers.Serializer):
    institution_id = serializers.IntegerField()
    identifier = serializers.CharField()
    email = serializers.EmailField()

    def validate(self, data):
        institution_id = data.get('institution_id')
        identifier = data.get('identifier')
        email = data.get('email')

        client = get_object_or_404(Client, id=institution_id)
        
        with schema_context(client.schema_name):
            try:
                registry_entry = PreSeededRegistry.objects.get(
                    identifier=identifier,
                    email=email
                )
                if registry_entry.is_active:
                    raise serializers.ValidationError("Account already activated.")
                data['registry_entry'] = registry_entry
                data['client'] = client
            except PreSeededRegistry.DoesNotExist:
                raise serializers.ValidationError("Identity not found in institutional registry.")
        
        return data

class ActivationCompleteSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(min_length=8)

class StudentLoginSerializer(serializers.Serializer):
    institution_id = serializers.IntegerField()
    identifier = serializers.CharField()
    password = serializers.CharField()

class FacultyLoginSerializer(serializers.Serializer):
    institution_id = serializers.IntegerField()
    email = serializers.EmailField()
    password = serializers.CharField()

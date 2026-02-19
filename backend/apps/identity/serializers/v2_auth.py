from rest_framework import serializers
from apps.auip_tenant.models import Client
from django_tenants.utils import schema_context
from django.shortcuts import get_object_or_404

class IdentityCheckSerializer(serializers.Serializer):
    institution_id = serializers.IntegerField()
    identifier = serializers.CharField()
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=['STUDENT', 'FACULTY', 'ADMIN'])

    def validate(self, data):
        institution_id = data.get('institution_id')
        identifier = data.get('identifier')
        email = data.get('email')
        role = data.get('role')

        client = get_object_or_404(Client, id=institution_id)
        
        from apps.auip_institution.models import (
            StudentPreSeededRegistry, 
            FacultyPreSeededRegistry, 
            AdminPreSeededRegistry
        )

        with schema_context(client.schema_name):
            try:
                if role == 'STUDENT':
                    registry_model = StudentPreSeededRegistry
                elif role == 'FACULTY':
                    registry_model = FacultyPreSeededRegistry
                else:
                    registry_model = AdminPreSeededRegistry

                registry_entry = registry_model.objects.get(
                    identifier=identifier,
                    email=email if role != 'ADMIN' else identifier # Admin identifier IS email
                )
                if registry_entry.is_activated:
                    raise serializers.ValidationError("Account already activated.")
                data['registry_entry'] = registry_entry
                data['client'] = client
            except registry_model.DoesNotExist:
                raise serializers.ValidationError(f"Identity not found in {role} registry.")
        
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

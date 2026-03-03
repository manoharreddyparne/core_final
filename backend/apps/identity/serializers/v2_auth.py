from rest_framework import serializers
from apps.auip_tenant.models import Client
from django_tenants.utils import schema_context
from django.shortcuts import get_object_or_404

class IdentityCheckSerializer(serializers.Serializer):
    institution_id = serializers.IntegerField()
    identifier = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    role = serializers.ChoiceField(choices=['STUDENT', 'FACULTY', 'ADMIN'])

    def validate(self, data):
        institution_id = data.get('institution_id')
        identifier = data.get('identifier')
        email = data.get('email') or None  # treat blank string as None
        role = data.get('role')

        from apps.identity.models.institution import Institution
        institution = get_object_or_404(Institution, id=institution_id)
        client = get_object_or_404(Client, schema_name=institution.schema_name)
        
        from apps.auip_institution.models import (
            StudentPreSeededRegistry, 
            FacultyPreSeededRegistry, 
            AdminPreSeededRegistry
        )

        with schema_context(client.schema_name):
            try:
                if role == 'STUDENT':
                    # ✅ Students: email is optional — look up by roll number only
                    registry_entry = StudentPreSeededRegistry.objects.get(
                        identifier__iexact=identifier
                    )
                elif role == 'FACULTY':
                    if not email:
                        raise serializers.ValidationError("Email is required for faculty activation.")
                    registry_entry = FacultyPreSeededRegistry.objects.get(
                        identifier__iexact=identifier,
                        email__iexact=email
                    )
                else:  # ADMIN
                    registry_entry = AdminPreSeededRegistry.objects.get(
                        identifier__iexact=identifier
                    )

                if registry_entry.is_activated:
                    # ✅ Return a response that the view can catch to return 200 already_activated
                    raise serializers.ValidationError({"detail": "Account already activated.", "code": "ALREADY_ACTIVATED"})
                
                data['registry_entry'] = registry_entry
                data['client'] = client
                # ✅ Always carry the actual email from the registry record
                data['email'] = registry_entry.email
            except (StudentPreSeededRegistry.DoesNotExist,
                    FacultyPreSeededRegistry.DoesNotExist,
                    AdminPreSeededRegistry.DoesNotExist):
                raise serializers.ValidationError(f"No user record found for {identifier}. Please contact your institution.")
        
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

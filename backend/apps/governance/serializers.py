from rest_framework import serializers
from .models import Blog, Newsletter, DocumentTemplate, StudentIntelligenceProfile, GovernancePolicy

class StudentIntelligenceProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentIntelligenceProfile
        fields = '__all__'

class GovernancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernancePolicy
        fields = '__all__'

class BlogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Blog
        fields = '__all__'

class NewsletterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Newsletter
        fields = '__all__'

class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = '__all__'

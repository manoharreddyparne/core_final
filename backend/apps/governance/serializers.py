from rest_framework import serializers
from .models import Blog, Newsletter, DocumentTemplate, StudentIntelligenceProfile, GovernancePolicy, BlogComment, BlogLike

class StudentIntelligenceProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentIntelligenceProfile
        fields = '__all__'

class GovernancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernancePolicy
        fields = '__all__'

class BlogCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogComment
        fields = '__all__'

class BlogSerializer(serializers.ModelSerializer):
    comments = BlogCommentSerializer(many=True, read_only=True)
    
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

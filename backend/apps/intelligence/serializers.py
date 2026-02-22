from rest_framework import serializers
from .models import (
    AIQuerySession, StudentResumeInsight, PlacementTrendInsight,
    AIChatConversation, AIChatMessage
)

class AIQuerySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIQuerySession
        fields = '__all__'
        read_only_fields = ['ai_response', 'tokens_used', 'latency_ms']

class StudentResumeInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentResumeInsight
        fields = '__all__'

class PlacementTrendInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementTrendInsight
        fields = '__all__'

class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = ['id', 'role', 'content', 'created_at']

class AIChatConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(source='messages.count', read_only=True)
    
    class Meta:
        model = AIChatConversation
        fields = ['id', 'title', 'context_type', 'message_count', 'created_at', 'updated_at']

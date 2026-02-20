from rest_framework import serializers
from .models import AIQuerySession, StudentResumeInsight, PlacementTrendInsight

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

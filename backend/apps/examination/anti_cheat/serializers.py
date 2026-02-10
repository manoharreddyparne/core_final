from rest_framework import serializers
from .models import AntiCheatLog

class AntiCheatLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AntiCheatLog
        fields = ['id', 'user', 'quiz', 'event_type', 'details', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

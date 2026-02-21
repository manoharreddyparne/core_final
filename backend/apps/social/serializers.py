from rest_framework import serializers
from .models import SocialPost, SocialLike, SocialComment, Connection, ChatSession, SupportTicket

class SocialCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialComment
        fields = '__all__'

class SocialPostSerializer(serializers.ModelSerializer):
    comments = SocialCommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = SocialPost
        fields = '__all__'

class ConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Connection
        fields = '__all__'

class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = '__all__'

class SupportTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = '__all__'

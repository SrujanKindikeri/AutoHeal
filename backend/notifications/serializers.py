from rest_framework import serializers
from notifications.models import Notification
from accounts.serializers import PublicUserSerializer

class NotificationSerializer(serializers.ModelSerializer):
    actor = PublicUserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'actor',
            'verb',
            'title',
            'message',
            'data',
            'is_read',
            'created_at',
        ]
        read_only_fields = ['id', 'actor', 'verb', 'title', 'message', 'data', 'created_at']

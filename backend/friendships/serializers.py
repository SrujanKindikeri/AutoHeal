from rest_framework import serializers
from accounts.models import User
from accounts.serializers import PublicUserSerializer
from friendships.models import Friendship, FriendRequest, UserBlock
from friendships.services import get_relationship_status

class SocialUserSerializer(PublicUserSerializer):
    """
    Public user card enriched with relationship_status relative to the requesting user.
    """
    relationship_status = serializers.SerializerMethodField()

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + ['relationship_status']

    def get_relationship_status(self, obj) -> str:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'none'
        return get_relationship_status(request.user, obj)


class FriendRequestSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)
    recipient = PublicUserSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = [
            'id',
            'sender',
            'recipient',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class SendFriendRequestSerializer(serializers.Serializer):
    target = serializers.CharField(
        required=True,
        trim_whitespace=True,
        help_text="Target user ID, MovieFlow ID (MF-XXXXXXXX), or username."
    )

    def validate_target(self, value):
        target = value.strip()
        user = None

        # Check if MovieFlow ID
        if target.upper().startswith("MF-"):
            user = User.objects.filter(movieflow_id__iexact=target).first()

        # Check if UUID
        if not user:
            try:
                import uuid
                uuid.UUID(target)
                user = User.objects.filter(id=target).first()
            except ValueError:
                pass

        # Check if username
        if not user:
            user = User.objects.filter(username__iexact=target).first()

        if not user:
            raise serializers.ValidationError("User not found.")

        return user


class FriendshipSerializer(serializers.ModelSerializer):
    friend = serializers.SerializerMethodField()

    class Meta:
        model = Friendship
        fields = ['id', 'friend', 'created_at']
        read_only_fields = fields

    def get_friend(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        friend_user = obj.get_friend(user) if user else obj.user2
        return PublicUserSerializer(friend_user).data


class UserBlockSerializer(serializers.ModelSerializer):
    blocked_user = serializers.SerializerMethodField()

    class Meta:
        model = UserBlock
        fields = ['id', 'blocked_user', 'reason', 'created_at']
        read_only_fields = fields

    def get_blocked_user(self, obj):
        return PublicUserSerializer(obj.blocked).data

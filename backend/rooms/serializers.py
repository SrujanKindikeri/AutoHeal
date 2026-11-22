"""
Serializers for the Rooms REST API.
"""
import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from rooms.models import Room, RoomParticipant, RoomInvitation


class RoomParticipantSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    movieflow_id = serializers.CharField(source='user.movieflow_id', read_only=True)

    class Meta:
        model = RoomParticipant
        fields = [
            'id', 'user', 'username', 'full_name', 'avatar_url', 'movieflow_id',
            'role', 'status', 'joined_at', 'readiness_state', 'connection_status',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.user.full_name if hasattr(obj.user, 'full_name') else obj.user.get_full_name()

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        profile = getattr(obj.user, 'profile', None)
        if profile and profile.avatar and request:
            return request.build_absolute_uri(profile.avatar.url)
        return None


class RoomSerializer(serializers.ModelSerializer):
    participants = RoomParticipantSerializer(many=True, read_only=True, source='participants.all')
    host_username = serializers.CharField(source='host.username', read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'description', 'room_type',
            'content_type', 'content_id', 'content_title', 'content_artwork_url',
            'content_metadata', 'playback_provider',
            'visibility', 'status', 'max_participants',
            'host', 'host_username', 'participant_count',
            'participants',
            'scheduled_start_time', 'actual_start_time', 'end_time',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'host', 'host_username', 'participants', 'participant_count',
            'status', 'actual_start_time', 'end_time', 'created_at', 'updated_at',
        ]

    def get_participant_count(self, obj):
        return obj.participants.filter(status=RoomParticipant.STATUS_JOINED).count()


class RoomCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = Room
        fields = [
            'name', 'description', 'room_type',
            'content_type', 'content_id', 'content_title', 'content_artwork_url',
            'content_metadata', 'playback_provider',
            'visibility', 'max_participants',
            'scheduled_start_time', 'password',
        ]

    def validate(self, data):
        room_type = data.get('room_type')
        content_type = data.get('content_type', '')
        playback_provider = data.get('playback_provider', '')

        if room_type == Room.ROOM_TYPE_MOVIE and content_type not in ('movie', 'tv_show', 'personal_movie'):
            raise serializers.ValidationError(
                "Movie rooms must reference a movie, TV show, or personal_movie."
            )
        if room_type == Room.ROOM_TYPE_MUSIC and content_type not in ('track', 'personal_track'):
            raise serializers.ValidationError(
                "Music rooms with personal uploads must reference a track or personal_track. "
                "Album/playlist music rooms are not yet supported for personal uploads."
            )
        if playback_provider == 'personal' and content_type not in ('personal_movie', 'personal_track'):
            raise serializers.ValidationError(
                "Provider 'personal' requires content_type 'personal_movie' or 'personal_track'."
            )
        return data

    def create(self, validated_data):
        import hashlib
        password = validated_data.pop('password', '')
        room = Room(**validated_data)
        if password:
            # Store bcrypt-compatible hash. Use hashlib pbkdf2 (no extra deps).
            import os
            salt = os.urandom(16).hex()
            hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
            room.password_hash = f"pbkdf2:{salt}:{hashed}"
        room.save()
        return room


class RoomInvitationSerializer(serializers.ModelSerializer):
    room_name = serializers.CharField(source='room.name', read_only=True)
    inviter = serializers.SerializerMethodField()

    class Meta:
        model = RoomInvitation
        fields = [
            'id', 'token', 'room', 'room_name', 'inviter',
            'invitee', 'email', 'status', 'expires_at', 'created_at',
        ]
        read_only_fields = ['id', 'token', 'room_name', 'inviter', 'status', 'expires_at', 'created_at']

    def get_inviter(self, obj):
        u = obj.inviter
        return {
            'id': str(u.id),
            'username': u.username,
            'full_name': u.full_name if hasattr(u, 'full_name') else u.get_full_name(),
            'movieflow_id': u.movieflow_id if hasattr(u, 'movieflow_id') else '',
        }


class RoomInvitationCreateSerializer(serializers.Serializer):
    """Input for creating an invitation: either an invitee user id or an email."""
    invitee_id = serializers.UUIDField(required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    expires_in_hours = serializers.IntegerField(default=48, min_value=1, max_value=168)

    def validate(self, data):
        if not data.get('invitee_id') and not data.get('email', '').strip():
            raise serializers.ValidationError(
                "Provide either 'invitee_id' or 'email'."
            )
        return data

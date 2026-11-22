import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from accounts.models import User, UserProfile
from accounts.services import create_verification_token

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile details and preferences."""
    class Meta:
        model = UserProfile
        fields = [
            'avatar',
            'avatar_url',
            'bio',
            'preferred_movie_genres',
            'preferred_music_genres',
            'date_of_birth',
            'is_profile_completed',
            'watch_history_visibility',
            'listening_history_visibility',
            'show_activity_status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_bio(self, value):
        if len(value) > 500:
            raise serializers.ValidationError("Bio cannot exceed 500 characters.")
        return value


class UserSerializer(serializers.ModelSerializer):
    """Full authenticated user serializer with nested profile."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'full_name',
            'movieflow_id',
            'is_active',
            'is_email_verified',
            'created_at',
            'last_login',
            'profile',
        ]
        read_only_fields = [
            'id',
            'movieflow_id',
            'is_active',
            'is_email_verified',
            'created_at',
            'last_login',
        ]


class PublicUserSerializer(serializers.ModelSerializer):
    """
    Publicly visible user card.
    Strictly excludes email, internal timestamps, or private fields.
    Guards against users who have no profile record (profile is None).
    """
    avatar_url = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    preferred_movie_genres = serializers.SerializerMethodField()
    preferred_music_genres = serializers.SerializerMethodField()
    is_profile_completed = serializers.SerializerMethodField()

    def get_avatar_url(self, obj) -> str:
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'avatar_url', '') or ''

    def get_bio(self, obj) -> str:
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'bio', '') or ''

    def get_preferred_movie_genres(self, obj) -> list:
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'preferred_movie_genres', []) or []

    def get_preferred_music_genres(self, obj) -> list:
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'preferred_music_genres', []) or []

    def get_is_profile_completed(self, obj) -> bool:
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'is_profile_completed', False) or False

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'movieflow_id',
            'avatar_url',
            'bio',
            'preferred_movie_genres',
            'preferred_music_genres',
            'is_profile_completed',
        ]
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    """Registration serializer with thorough Apple-grade validation."""
    full_name = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    email = serializers.EmailField(required=True)
    username = serializers.CharField(max_length=50, required=True, trim_whitespace=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True)
    terms_accepted = serializers.BooleanField(required=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return normalized

    def validate_username(self, value):
        username = value.strip()
        if len(username) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if not re.match(r'^[a-zA-Z0-9_.-]+$', username):
            raise serializers.ValidationError("Username may only contain letters, numbers, underscores, dots, and hyphens.")
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("This username is already taken. Please choose another.")
        return username

    def validate_terms_accepted(self, value):
        if not value:
            raise serializers.ValidationError("You must accept the terms and conditions to register.")
        return value

    def validate(self, attrs):
        password = attrs.get('password')
        confirm_password = attrs.get('confirm_password')

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        # Password strength validation: at least 8 chars, contains letters and numbers
        if len(password) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        if not re.search(r'[A-Za-z]', password) or not re.search(r'[0-9]', password):
            raise serializers.ValidationError({"password": "Password must contain both letters and numbers."})

        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        validated_data.pop('terms_accepted')
        password = validated_data.pop('password')

        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        # Create verification token and trigger email
        create_verification_token(user)
        return user


class LoginSerializer(serializers.Serializer):
    """Login serializer supporting email or username."""
    identifier = serializers.CharField(required=True, trim_whitespace=True)
    password = serializers.CharField(required=True, write_only=True)


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        p1 = attrs.get('new_password')
        p2 = attrs.get('confirm_password')
        if p1 != p2:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if len(p1) < 8:
            raise serializers.ValidationError({"new_password": "Password must be at least 8 characters long."})
        if not re.search(r'[A-Za-z]', p1) or not re.search(r'[0-9]', p1):
            raise serializers.ValidationError({"new_password": "Password must contain both letters and numbers."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

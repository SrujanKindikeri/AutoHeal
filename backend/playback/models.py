import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


# ==============================================================================
# PlaybackProvider
# ==============================================================================

class PlaybackProvider(models.Model):
    """
    Catalogue of legal content playback providers (open content, OTT aggregators,
    licensed embeds, direct partner APIs).
    """
    PROVIDER_TYPE_OPEN_CONTENT = 'open_content'
    PROVIDER_TYPE_OTT_AGGREGATOR = 'ott_aggregator'
    PROVIDER_TYPE_LICENSED_EMBED = 'licensed_embed'
    PROVIDER_TYPE_PARTNER_API = 'partner_api'

    PROVIDER_TYPE_CHOICES = [
        (PROVIDER_TYPE_OPEN_CONTENT, 'Open Content / Licensed Public Domain'),
        (PROVIDER_TYPE_OTT_AGGREGATOR, 'Authorized OTT Partner / Watch Provider'),
        (PROVIDER_TYPE_LICENSED_EMBED, 'Licensed Third-Party Embed SDK'),
        (PROVIDER_TYPE_PARTNER_API, 'Direct Licensed Distribution Partner'),
    ]

    id = models.CharField(
        max_length=64,
        primary_key=True,
        help_text="Unique provider slug, e.g. 'open-cinema', 'netflix'",
    )
    name = models.CharField(max_length=255)
    provider_type = models.CharField(
        max_length=40,
        choices=PROVIDER_TYPE_CHOICES,
        default=PROVIDER_TYPE_OPEN_CONTENT,
    )
    logo_url = models.URLField(max_length=1000, blank=True, default='')
    description = models.TextField(blank=True, default='')
    website_url = models.URLField(max_length=1000, blank=True, default='')
    documentation_url = models.URLField(max_length=1000, blank=True, default='')
    is_active = models.BooleanField(default=True)
    supports_embedded_playback = models.BooleanField(
        default=False,
        help_text='Permitted by official license/ToS for embedded in-app playback',
    )
    supports_external_playback = models.BooleanField(
        default=True,
        help_text='Supports deep-linking to official app or website',
    )
    supports_group_playback = models.BooleanField(
        default=False,
        help_text='Permitted for synchronized multi-user room viewing',
    )
    requires_auth = models.BooleanField(
        default=False,
        help_text='Requires connected user subscription or OAuth account',
    )
    supported_territories = models.JSONField(
        blank=True,
        default=list,
        help_text="ISO country codes or ['GLOBAL']",
    )
    capabilities_metadata = models.JSONField(blank=True, default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['provider_type', 'is_active'], name='playback_pl_provide_bced8a_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.id})"


# ==============================================================================
# UserProviderConnection
# ==============================================================================

class UserProviderConnection(models.Model):
    """
    Links a user's streaming account to a PlaybackProvider via OAuth.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='provider_connections',
    )
    provider = models.ForeignKey(
        PlaybackProvider,
        on_delete=models.CASCADE,
        related_name='user_connections',
    )
    account_identifier = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Masked user email or handle',
    )
    is_connected = models.BooleanField(default=True)
    auth_data = models.JSONField(
        blank=True,
        default=dict,
        help_text='OAuth token metadata and scope restrictions',
    )
    territory = models.CharField(
        max_length=10,
        default='US',
        help_text="User's primary streaming territory (ISO-3166)",
    )
    connected_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-connected_at']
        unique_together = [('user', 'provider')]

    def __str__(self):
        return f"{self.user} <-> {self.provider_id} ({'connected' if self.is_connected else 'disconnected'})"


# ==============================================================================
# ContentProviderAvailability
# ==============================================================================

class ContentProviderAvailability(models.Model):
    """
    Per-content availability cache for a provider in a territory.
    """
    STATUS_AVAILABLE = 'available'
    STATUS_UNAVAILABLE = 'unavailable'
    STATUS_TERRITORY_RESTRICTED = 'territory_restricted'
    STATUS_AUTH_REQUIRED = 'authentication_required'
    STATUS_SUBSCRIPTION_REQUIRED = 'subscription_required'
    STATUS_PROVIDER_TEMP_UNAVAILABLE = 'provider_temporarily_unavailable'
    STATUS_RIGHTS_NOT_VERIFIED = 'rights_not_verified'

    AVAILABILITY_STATUS_CHOICES = [
        (STATUS_AVAILABLE, 'Available'),
        (STATUS_UNAVAILABLE, 'Unavailable'),
        (STATUS_TERRITORY_RESTRICTED, 'Territory Restricted'),
        (STATUS_AUTH_REQUIRED, 'Authentication Required'),
        (STATUS_SUBSCRIPTION_REQUIRED, 'Subscription Required'),
        (STATUS_PROVIDER_TEMP_UNAVAILABLE, 'Provider Temporarily Unavailable'),
        (STATUS_RIGHTS_NOT_VERIFIED, 'Rights Not Verified'),
    ]

    MONETIZATION_OPEN_ACCESS = 'free'
    MONETIZATION_FLATRATE = 'flatrate'
    MONETIZATION_RENT = 'rent'
    MONETIZATION_BUY = 'buy'
    MONETIZATION_OPEN_CC = 'open_access'

    MONETIZATION_TYPE_CHOICES = [
        (MONETIZATION_OPEN_ACCESS, 'Free'),
        (MONETIZATION_FLATRATE, 'Subscription (Flatrate)'),
        (MONETIZATION_RENT, 'Rent'),
        (MONETIZATION_BUY, 'Buy'),
        (MONETIZATION_OPEN_CC, 'Open Access / Creative Commons'),
    ]

    CONTENT_TYPE_CHOICES = [
        ('movie', 'Movie'),
        ('tv_show', 'TV Show'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPE_CHOICES,
        default='movie',
    )
    content_id = models.CharField(max_length=255, db_index=True)
    content_title = models.CharField(max_length=500, blank=True, default='')
    provider = models.ForeignKey(
        PlaybackProvider,
        on_delete=models.CASCADE,
        related_name='availabilities',
    )
    territory = models.CharField(max_length=10, default='US', db_index=True)
    availability_status = models.CharField(
        max_length=40,
        choices=AVAILABILITY_STATUS_CHOICES,
        default=STATUS_AVAILABLE,
        db_index=True,
    )
    monetization_type = models.CharField(
        max_length=30,
        choices=MONETIZATION_TYPE_CHOICES,
        default=MONETIZATION_OPEN_ACCESS,
    )
    quality_available = models.CharField(max_length=20, default='HD')
    playback_url = models.URLField(max_length=2000, blank=True, default='')
    deep_link_web = models.URLField(max_length=2000, blank=True, default='')
    deep_link_app = models.URLField(max_length=2000, blank=True, default='')
    stream_manifest_url = models.URLField(max_length=2000, blank=True, default='')
    subtitle_tracks = models.JSONField(
        blank=True,
        default=list,
        help_text='WebVTT tracks [{label, src, srclang, default}]',
    )
    audio_tracks = models.JSONField(
        blank=True,
        default=list,
        help_text='Audio tracks [{label, language, codec}]',
    )
    quality_levels = models.JSONField(
        blank=True,
        default=list,
        help_text='Quality variants [{label, resolution, bitrate, url}]',
    )
    last_checked_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_checked_at']
        indexes = [
            models.Index(fields=['content_type', 'content_id', 'territory'], name='playback_co_content_f20a5c_idx'),
            models.Index(fields=['availability_status'], name='playback_co_availab_33a25b_idx'),
        ]
        unique_together = [('content_type', 'content_id', 'provider', 'territory')]

    def __str__(self):
        return f"{self.content_title} on {self.provider_id} ({self.territory}) - {self.availability_status}"


# ==============================================================================
# PlaybackSession
# ==============================================================================

class PlaybackSession(models.Model):
    """
    Active or completed playback session for a movie, TV show, or music track.
    """
    STATUS_INITIATED = 'initiated'
    STATUS_ACTIVE = 'active'
    STATUS_PAUSED = 'paused'
    STATUS_ENDED = 'ended'
    STATUS_EXPIRED = 'expired'
    STATUS_FAILED = 'failed'

    SESSION_STATUS_CHOICES = [
        (STATUS_INITIATED, 'Initiated'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PAUSED, 'Paused'),
        (STATUS_ENDED, 'Ended'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_FAILED, 'Failed'),
    ]

    STREAM_MP4 = 'mp4'
    STREAM_HLS = 'hls'
    STREAM_EMBED_IFRAME = 'embed_iframe'
    STREAM_EXTERNAL_DEEP_LINK = 'external_deep_link'

    STREAM_TYPE_CHOICES = [
        (STREAM_HLS, 'HLS (m3u8)'),
        (STREAM_MP4, 'Direct MP4 Stream'),
        (STREAM_EMBED_IFRAME, 'Authorized Embed Iframe'),
        (STREAM_EXTERNAL_DEEP_LINK, 'External Provider Application / Website'),
    ]

    CONTENT_TYPE_CHOICES = [
        ('movie', 'Movie'),
        ('tv_show', 'TV Show'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='playback_sessions',
    )
    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPE_CHOICES,
        default='movie',
    )
    content_id = models.CharField(max_length=255)
    content_title = models.CharField(max_length=500, blank=True, default='')
    content_artwork_url = models.URLField(max_length=1000, blank=True, default='')
    provider = models.ForeignKey(
        PlaybackProvider,
        on_delete=models.CASCADE,
        related_name='playback_sessions',
    )
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='initiated_playback_sessions',
    )
    session_status = models.CharField(
        max_length=30,
        choices=SESSION_STATUS_CHOICES,
        default=STATUS_INITIATED,
        db_index=True,
    )
    stream_type = models.CharField(
        max_length=30,
        choices=STREAM_TYPE_CHOICES,
        default=STREAM_MP4,
    )
    playback_url = models.URLField(max_length=2000, blank=True, default='')
    current_position_seconds = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    duration_seconds = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    playback_state = models.JSONField(blank=True, default=dict)
    external_session_reference = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_status'], name='playback_pl_session_06eb3b_idx'),
            models.Index(fields=['room', 'session_status'], name='playback_pl_room_id_181fd5_idx'),
        ]

    def __str__(self):
        return f"PlaybackSession({self.content_title}, {self.session_status})"

    @property
    def is_expired(self) -> bool:
        """Returns True when expires_at is set and is in the past."""
        if self.expires_at and timezone.now() >= self.expires_at:
            return True
        return False


# ==============================================================================
# RoomPlaybackState  (Phase 14 — from migration 0002)
# ==============================================================================

class RoomPlaybackState(models.Model):
    """
    Authoritative server-side playback state for a Universal Room.
    """
    STATUS_IDLE = 'idle'
    STATUS_LOADING = 'loading'
    STATUS_PLAYING = 'playing'
    STATUS_PAUSED = 'paused'
    STATUS_BUFFERING = 'buffering'
    STATUS_ENDED = 'ended'
    STATUS_ERROR = 'error'

    STATUS_CHOICES = [
        (STATUS_IDLE, 'Idle'),
        (STATUS_LOADING, 'Loading Content'),
        (STATUS_PLAYING, 'Playing'),
        (STATUS_PAUSED, 'Paused'),
        (STATUS_BUFFERING, 'Buffering'),
        (STATUS_ENDED, 'Ended'),
        (STATUS_ERROR, 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.OneToOneField(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='playback_state',
    )
    playback_session = models.ForeignKey(
        PlaybackSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='room_states',
    )
    active_provider = models.ForeignKey(
        PlaybackProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='active_room_states',
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default=STATUS_IDLE,
        db_index=True,
    )
    position_seconds = models.FloatField(default=0.0)
    playback_rate = models.FloatField(default=1.0)
    is_playing = models.BooleanField(default=False)
    current_content = models.JSONField(blank=True, default=dict)
    version = models.PositiveIntegerField(
        default=1,
        help_text='State version counter for optimistic concurrency',
    )
    sequence_number = models.PositiveIntegerField(
        default=0,
        help_text='Monotonically increasing event sequence counter',
    )
    last_updated_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_playback_states',
    )

    class Meta:
        ordering = ['-last_updated_at']

    def __str__(self):
        return f"RoomPlaybackState(room={self.room_id}, status={self.status}, v{self.version})"

    def compute_current_position(self) -> float:
        """
        Calculates virtual playback position based on monotonic elapsed server time.
        """
        if self.is_playing and self.status == self.STATUS_PLAYING:
            elapsed = (timezone.now() - self.last_updated_at).total_seconds()
            return max(0.0, float(self.position_seconds) + elapsed * float(self.playback_rate))
        return max(0.0, float(self.position_seconds))

    def to_dict(self) -> dict:
        current_pos = self.compute_current_position()
        return {
            "id": str(self.id),
            "room_id": str(self.room_id),
            "session_id": str(self.playback_session_id) if self.playback_session_id else None,
            "status": self.status,
            "position_seconds": round(current_pos, 3),
            "base_position_seconds": round(float(self.position_seconds), 3),
            "playback_rate": float(self.playback_rate),
            "is_playing": self.is_playing,
            "version": self.version,
            "sequence_number": self.sequence_number,
            "active_provider_id": self.active_provider_id,
            "active_provider_name": self.active_provider.name if self.active_provider else None,
            "supports_group_playback": self.active_provider.supports_group_playback if self.active_provider else False,
            "current_content": self.current_content or {},
            "last_updated_at": self.last_updated_at.isoformat(),
            "server_time": timezone.now().isoformat(),
            "updated_by": {
                "id": str(self.updated_by.id),
                "username": self.updated_by.username,
            } if self.updated_by else None,
        }


# ==============================================================================
# PlaybackEvent  (Phase 14 — from migration 0002)
# ==============================================================================

class PlaybackEvent(models.Model):
    """
    Immutable audit event log for all playback commands and state transitions.
    """
    EVENT_PLAY = 'PLAY'
    EVENT_PAUSE = 'PAUSE'
    EVENT_SEEK = 'SEEK'
    EVENT_BUFFERING = 'BUFFERING'
    EVENT_RESUMED = 'RESUMED'
    EVENT_ENDED = 'ENDED'
    EVENT_ERROR = 'ERROR'
    EVENT_HOST_CHANGED = 'HOST_CHANGED'
    EVENT_PARTICIPANT_JOINED = 'PARTICIPANT_JOINED'
    EVENT_PARTICIPANT_LEFT = 'PARTICIPANT_LEFT'

    EVENT_CHOICES = [
        (EVENT_PLAY, 'Play'),
        (EVENT_PAUSE, 'Pause'),
        (EVENT_SEEK, 'Seek'),
        (EVENT_BUFFERING, 'Buffering'),
        (EVENT_RESUMED, 'Resumed'),
        (EVENT_ENDED, 'Ended'),
        (EVENT_ERROR, 'Error'),
        (EVENT_HOST_CHANGED, 'Host Changed'),
        (EVENT_PARTICIPANT_JOINED, 'Participant Joined'),
        (EVENT_PARTICIPANT_LEFT, 'Participant Left'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.CASCADE,
        related_name='playback_events',
    )
    event_type = models.CharField(max_length=40, choices=EVENT_CHOICES, db_index=True)
    sequence_number = models.PositiveIntegerField(db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='playback_events_triggered',
    )
    previous_position = models.FloatField(default=0.0)
    new_position = models.FloatField(default=0.0)
    playback_state_version = models.PositiveIntegerField(default=1)
    event_timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    metadata = models.JSONField(blank=True, default=dict)

    class Meta:
        ordering = ['sequence_number']
        indexes = [
            models.Index(fields=['room', 'sequence_number'], name='playback_pl_room_id_57d492_idx'),
            models.Index(fields=['room', '-event_timestamp'], name='playback_pl_room_id_f1e75c_idx'),
        ]

    def __str__(self):
        actor_name = self.actor.username if self.actor else "system"
        return f"[{self.event_type} #{self.sequence_number}] Room {self.room_id} by {actor_name}"

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "room_id": str(self.room_id),
            "event_type": self.event_type,
            "sequence_number": self.sequence_number,
            "actor": {
                "id": str(self.actor.id),
                "username": self.actor.username,
            } if self.actor else None,
            "previous_position": round(float(self.previous_position), 3),
            "new_position": round(float(self.new_position), 3),
            "playback_state_version": self.playback_state_version,
            "event_timestamp": self.event_timestamp.isoformat(),
            "metadata": self.metadata or {},
        }

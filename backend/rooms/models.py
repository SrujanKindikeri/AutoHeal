import uuid
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone


class Room(models.Model):
    """
    Universal Room model supporting both MovieFlow Watch and MovieFlow Listen.
    """
    ROOM_TYPE_MOVIE = 'movie'
    ROOM_TYPE_MUSIC = 'music'
    ROOM_TYPE_CHOICES = [
        (ROOM_TYPE_MOVIE, 'MovieFlow Watch'),
        (ROOM_TYPE_MUSIC, 'MovieFlow Listen'),
    ]

    CONTENT_TYPE_CHOICES = [
        ('movie', 'Movie'),
        ('tv_show', 'TV Show'),
        ('track', 'Music Track'),
        ('album', 'Music Album'),
        ('playlist', 'Playlist'),
    ]

    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_PUBLIC = 'public'
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, 'Private'),
        (VISIBILITY_PUBLIC, 'Public'),
    ]

    STATUS_DRAFT = 'draft'
    STATUS_SCHEDULED = 'scheduled'
    STATUS_WAITING = 'waiting'
    STATUS_LIVE = 'live'
    STATUS_ENDED = 'ended'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_WAITING, 'Waiting'),
        (STATUS_LIVE, 'Live'),
        (STATUS_ENDED, 'Ended'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_rooms'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, db_index=True)
    
    # Universal Content Reference
    content_type = models.CharField(max_length=30, choices=CONTENT_TYPE_CHOICES)
    content_id = models.CharField(max_length=255)
    content_title = models.CharField(max_length=500, blank=True, default='')
    content_artwork_url = models.URLField(max_length=1000, blank=True, default='')
    content_metadata = models.JSONField(default=dict, blank=True)
    cover_artwork_url = models.URLField(max_length=1000, blank=True, default='')
    playback_provider = models.CharField(max_length=50, blank=True, default='')

    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_WAITING,
        db_index=True
    )
    max_participants = models.PositiveIntegerField(default=10)
    # Optional room password (bcrypt hash stored; plain text never persisted)
    password_hash = models.CharField(max_length=255, blank=True, default='')

    scheduled_start_time = models.DateTimeField(null=True, blank=True, db_index=True)
    actual_start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room_type', 'status']),
            models.Index(fields=['visibility', 'status']),
            models.Index(fields=['scheduled_start_time']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_room_type_display()} - {self.status})"

    def clean(self):
        super().clean()
        # Content type compatibility validation
        if self.room_type == self.ROOM_TYPE_MOVIE and self.content_type not in ['movie', 'tv_show']:
            raise ValidationError(
                f"Movie rooms can only reference movies or TV shows, not '{self.content_type}'."
            )
        if self.room_type == self.ROOM_TYPE_MUSIC and self.content_type not in ['track', 'album', 'playlist']:
            raise ValidationError(
                f"Music rooms can only reference tracks, albums, or playlists, not '{self.content_type}'."
            )
        if self.max_participants < 2:
            raise ValidationError("A room must allow at least 2 participants.")


class RoomSettings(models.Model):
    """
    Room configuration stored separately from the core Room model.
    Dynamically configurable settings across access, playback, communication,
    notifications, and co-host governance.
    """
    PLAYBACK_MODE_EVERYONE = 'everyone'
    PLAYBACK_MODE_HOST_ONLY = 'host_only'
    PLAYBACK_MODE_HOST_AND_COHOSTS = 'host_and_cohosts'
    PLAYBACK_MODE_CHOICES = [
        (PLAYBACK_MODE_EVERYONE, 'Everyone Controls Playback'),
        (PLAYBACK_MODE_HOST_ONLY, 'Host Only'),
        (PLAYBACK_MODE_HOST_AND_COHOSTS, 'Host & Co-Hosts'),
    ]

    INVITE_POLICY_EVERYONE = 'everyone'
    INVITE_POLICY_COHOSTS = 'cohosts'
    INVITE_POLICY_HOST_ONLY = 'host_only'
    INVITE_POLICY_CHOICES = [
        (INVITE_POLICY_EVERYONE, 'Everyone Can Invite'),
        (INVITE_POLICY_COHOSTS, 'Host & Authorized Co-Hosts'),
        (INVITE_POLICY_HOST_ONLY, 'Host Only'),
    ]

    CHAT_PERMISSION_EVERYONE = 'everyone'
    CHAT_PERMISSION_HOST_AND_COHOSTS = 'host_and_cohosts'
    CHAT_PERMISSION_HOST_ONLY = 'host_only'
    CHAT_PERMISSION_DISABLED = 'disabled'
    CHAT_PERMISSION_CHOICES = [
        (CHAT_PERMISSION_EVERYONE, 'Everyone Can Chat'),
        (CHAT_PERMISSION_HOST_AND_COHOSTS, 'Host & Co-Hosts Only'),
        (CHAT_PERMISSION_HOST_ONLY, 'Host Only'),
        (CHAT_PERMISSION_DISABLED, 'Chat Disabled'),
    ]

    VOICE_PERMISSION_EVERYONE = 'everyone'
    VOICE_PERMISSION_HOST_AND_COHOSTS = 'host_and_cohosts'
    VOICE_PERMISSION_HOST_ONLY = 'host_only'
    VOICE_PERMISSION_DISABLED = 'disabled'
    VOICE_PERMISSION_CHOICES = [
        (VOICE_PERMISSION_EVERYONE, 'Everyone Can Speak'),
        (VOICE_PERMISSION_HOST_AND_COHOSTS, 'Host & Co-Hosts Only'),
        (VOICE_PERMISSION_HOST_ONLY, 'Host Only'),
        (VOICE_PERMISSION_DISABLED, 'Voice Disabled'),
    ]

    VIDEO_PERMISSION_EVERYONE = 'everyone'
    VIDEO_PERMISSION_HOST_AND_COHOSTS = 'host_and_cohosts'
    VIDEO_PERMISSION_HOST_ONLY = 'host_only'
    VIDEO_PERMISSION_DISABLED = 'disabled'
    VIDEO_PERMISSION_CHOICES = [
        (VIDEO_PERMISSION_EVERYONE, 'Everyone Can Publish Video'),
        (VIDEO_PERMISSION_HOST_AND_COHOSTS, 'Host & Co-Hosts Only'),
        (VIDEO_PERMISSION_HOST_ONLY, 'Host Only'),
        (VIDEO_PERMISSION_DISABLED, 'Video Disabled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.OneToOneField(Room, on_delete=models.CASCADE, related_name='settings')

    # Communication & Interactions
    chat_enabled = models.BooleanField(default=True)
    chat_permission_mode = models.CharField(
        max_length=20,
        choices=CHAT_PERMISSION_CHOICES,
        default=CHAT_PERMISSION_EVERYONE
    )
    voice_enabled = models.BooleanField(default=True)
    voice_permission_mode = models.CharField(
        max_length=20,
        choices=VOICE_PERMISSION_CHOICES,
        default=VOICE_PERMISSION_EVERYONE
    )
    video_enabled = models.BooleanField(default=True)
    video_permission_mode = models.CharField(
        max_length=20,
        choices=VIDEO_PERMISSION_CHOICES,
        default=VIDEO_PERMISSION_EVERYONE
    )
    reactions_enabled = models.BooleanField(default=True)
    smart_notifications_enabled = models.BooleanField(default=True)

    # Dynamic Notification Settings
    room_reminders_enabled = models.BooleanField(default=True)
    participant_join_alerts = models.BooleanField(default=True)
    room_event_alerts = models.BooleanField(default=True)

    # Permissions & Policies
    playback_permission_mode = models.CharField(
        max_length=30,
        choices=PLAYBACK_MODE_CHOICES,
        default=PLAYBACK_MODE_HOST_ONLY
    )
    require_approval = models.BooleanField(default=False)
    allow_cohosts = models.BooleanField(default=True)
    invite_policy = models.CharField(
        max_length=20,
        choices=INVITE_POLICY_CHOICES,
        default=INVITE_POLICY_EVERYONE
    )
    cohost_permissions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom permissions granted to co-hosts"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for Room {self.room_id}"


class RoomParticipant(models.Model):
    """
    Tracks users in a room with roles and lifecycles.
    """
    ROLE_HOST = 'host'
    ROLE_CO_HOST = 'co_host'
    ROLE_PARTICIPANT = 'participant'
    ROLE_CHOICES = [
        (ROLE_HOST, 'Host'),
        (ROLE_CO_HOST, 'Co-Host'),
        (ROLE_PARTICIPANT, 'Participant'),
    ]

    STATUS_INVITED = 'invited'
    STATUS_REQUESTED = 'requested'
    STATUS_APPROVED = 'approved'
    STATUS_JOINED = 'joined'
    STATUS_LEFT = 'left'
    STATUS_REMOVED = 'removed'
    STATUS_CHOICES = [
        (STATUS_INVITED, 'Invited'),
        (STATUS_REQUESTED, 'Requested Access'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_JOINED, 'Joined'),
        (STATUS_LEFT, 'Left'),
        (STATUS_REMOVED, 'Removed by Host'),
    ]

    READINESS_NOT_READY = 'not_ready'
    READINESS_READY = 'ready'
    READINESS_AWAY = 'away'
    READINESS_CHOICES = [
        (READINESS_NOT_READY, 'Not Ready'),
        (READINESS_READY, 'Ready'),
        (READINESS_AWAY, 'Away'),
    ]

    CONNECTION_CONNECTED = 'connected'
    CONNECTION_DISCONNECTED = 'disconnected'
    CONNECTION_CHOICES = [
        (CONNECTION_CONNECTED, 'Connected'),
        (CONNECTION_DISCONNECTED, 'Disconnected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_participations'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PARTICIPANT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_JOINED, db_index=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)

    # Readiness & Real Presence (Phase 11)
    readiness_state = models.CharField(
        max_length=20,
        choices=READINESS_CHOICES,
        default=READINESS_NOT_READY,
        db_index=True
    )
    readiness_updated_at = models.DateTimeField(null=True, blank=True)
    connection_status = models.CharField(
        max_length=20,
        choices=CONNECTION_CHOICES,
        default=CONNECTION_DISCONNECTED,
        db_index=True
    )
    last_seen_at = models.DateTimeField(null=True, blank=True)
    is_mic_muted = models.BooleanField(default=False)
    is_camera_off = models.BooleanField(default=True)
    device_check_completed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['role', 'created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'user'],
                name='unique_room_user_participant'
            )
        ]

    def __str__(self):
        return f"{self.user.username} in {self.room.name} ({self.role} - {self.status})"


class RoomRolePermission(models.Model):
    """
    Fine-grained permissions assigned to specific co-hosts or participants in a room.
    Only controlled keys are supported.
    """
    PERMISSION_CONTROL_PLAYBACK = 'control_playback'
    PERMISSION_MANAGE_PARTICIPANTS = 'manage_participants'
    PERMISSION_MODERATE_CHAT = 'moderate_chat'
    PERMISSION_MANAGE_COMMUNICATION = 'manage_communication'
    PERMISSION_INVITE_PARTICIPANTS = 'invite_participants'
    PERMISSION_MANAGE_SETTINGS = 'manage_settings'

    SUPPORTED_PERMISSIONS = [
        (PERMISSION_CONTROL_PLAYBACK, 'Control Playback'),
        (PERMISSION_MANAGE_PARTICIPANTS, 'Manage Participants'),
        (PERMISSION_MODERATE_CHAT, 'Moderate Chat'),
        (PERMISSION_MANAGE_COMMUNICATION, 'Manage Communication'),
        (PERMISSION_INVITE_PARTICIPANTS, 'Invite Participants'),
        (PERMISSION_MANAGE_SETTINGS, 'Manage Settings'),
    ]

    SUPPORTED_KEYS = [k for k, _ in SUPPORTED_PERMISSIONS]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='role_permissions')
    participant = models.ForeignKey(
        RoomParticipant,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    permission_key = models.CharField(max_length=50, choices=SUPPORTED_PERMISSIONS, db_index=True)
    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='granted_room_permissions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['participant', 'permission_key'],
                name='unique_participant_permission'
            )
        ]

    def __str__(self):
        return f"{self.participant.user.username} -> {self.permission_key} in {self.room.name}"


class RoomSettingsRevision(models.Model):
    """
    Audit log of settings revisions over time for a room.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='settings_revisions')
    previous_settings = models.JSONField(default=dict)
    updated_settings = models.JSONField(default=dict)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='room_settings_updates'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Settings revision for {self.room_id} at {self.created_at}"


class RoomEvent(models.Model):
    """
    Structured event log for room activity history.
    """
    EVENT_ROOM_CREATED = 'room_created'
    EVENT_PARTICIPANT_JOINED = 'participant_joined'
    EVENT_PARTICIPANT_LEFT = 'participant_left'
    EVENT_PARTICIPANT_INVITED = 'participant_invited'
    EVENT_PARTICIPANT_APPROVED = 'participant_approved'
    EVENT_PARTICIPANT_REMOVED = 'participant_removed'
    EVENT_PARTICIPANT_PROMOTED = 'participant_promoted'
    EVENT_PARTICIPANT_DEMOTED = 'participant_demoted'
    EVENT_PERMISSIONS_UPDATED = 'permissions_updated'
    EVENT_HOST_TRANSFERRED = 'host_transferred'
    EVENT_SETTINGS_CHANGED = 'settings_changed'
    EVENT_PLAYBACK_STATE_CHANGED = 'playback_state_changed'
    EVENT_ROOM_STARTED = 'room_started'
    EVENT_ROOM_ENDED = 'room_ended'
    EVENT_ROOM_CANCELLED = 'room_cancelled'
    EVENT_HOST_ACTION = 'host_action'
    EVENT_READINESS_UPDATED = 'readiness_updated'
    EVENT_CONNECTION_ESTABLISHED = 'connection_established'
    EVENT_CONNECTION_LOST = 'connection_lost'
    EVENT_DEVICE_STATE_UPDATED = 'device_state_updated'
    EVENT_INVITATION_SENT = 'invitation_sent'
    EVENT_INVITATION_ACCEPTED = 'invitation_accepted'
    EVENT_INVITATION_REJECTED = 'invitation_rejected'
    EVENT_INVITATION_REVOKED = 'invitation_revoked'

    EVENT_CHOICES = [
        (EVENT_ROOM_CREATED, 'Room Created'),
        (EVENT_PARTICIPANT_JOINED, 'Participant Joined'),
        (EVENT_PARTICIPANT_LEFT, 'Participant Left'),
        (EVENT_PARTICIPANT_INVITED, 'Participant Invited'),
        (EVENT_PARTICIPANT_APPROVED, 'Participant Approved'),
        (EVENT_PARTICIPANT_REMOVED, 'Participant Removed'),
        (EVENT_PARTICIPANT_PROMOTED, 'Participant Promoted to Co-Host'),
        (EVENT_PARTICIPANT_DEMOTED, 'Participant Demoted'),
        (EVENT_PERMISSIONS_UPDATED, 'Permissions Updated'),
        (EVENT_HOST_TRANSFERRED, 'Host Transferred'),
        (EVENT_SETTINGS_CHANGED, 'Settings Changed'),
        (EVENT_PLAYBACK_STATE_CHANGED, 'Playback State Changed'),
        (EVENT_ROOM_STARTED, 'Room Started'),
        (EVENT_ROOM_ENDED, 'Room Ended'),
        (EVENT_ROOM_CANCELLED, 'Room Cancelled'),
        (EVENT_HOST_ACTION, 'Host Action'),
        (EVENT_READINESS_UPDATED, 'Readiness Updated'),
        (EVENT_CONNECTION_ESTABLISHED, 'Connection Established'),
        (EVENT_CONNECTION_LOST, 'Connection Lost'),
        (EVENT_DEVICE_STATE_UPDATED, 'Device State Updated'),
        (EVENT_INVITATION_SENT, 'Invitation Sent'),
        (EVENT_INVITATION_ACCEPTED, 'Invitation Accepted'),
        (EVENT_INVITATION_REJECTED, 'Invitation Rejected'),
        (EVENT_INVITATION_REVOKED, 'Invitation Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=50, choices=EVENT_CHOICES, db_index=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='room_events_triggered'
    )
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.event_type}] Room {self.room_id} at {self.created_at}"


# ==============================================================================
# Phase 12: Room Invitations Model
# ==============================================================================

class RoomInvitation(models.Model):
    """
    Formal invitation to a Universal Room (Movie or Music).
    Supports direct user invites, email invites, and shareable invitation links.
    """
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_EXPIRED = 'expired'
    STATUS_REVOKED = 'revoked'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_REVOKED, 'Revoked'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    inviter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_room_invitations'
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='received_room_invitations'
    )
    email = models.EmailField(blank=True, default='', db_index=True)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True
    )
    expires_at = models.DateTimeField(db_index=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    # Email tracking
    email_sent = models.BooleanField(default=False)
    email_delivery_status = models.CharField(
        max_length=20,
        default='none',
        choices=[('none', 'None'), ('sent', 'Sent'), ('failed', 'Failed')]
    )
    email_sent_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', 'status']),
            models.Index(fields=['invitee', 'status']),
            models.Index(fields=['inviter', 'status']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['expires_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'invitee'],
                condition=models.Q(status='pending', invitee__isnull=False),
                name='unique_pending_room_invitee'
            ),
            models.UniqueConstraint(
                fields=['room', 'email'],
                condition=models.Q(status='pending', email__gt=''),
                name='unique_pending_room_email'
            )
        ]

    def __str__(self):
        target = self.invitee.username if self.invitee else (self.email or "Link")
        return f"Invite to {self.room.name} for {target} [{self.status}]"

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    def check_and_mark_expired(self) -> bool:
        if self.status == self.STATUS_PENDING and self.is_expired:
            self.status = self.STATUS_EXPIRED
            self.save(update_fields=['status', 'updated_at'])
            return True
        return False


# ==============================================================================
# Phase 17: Real-Time Chat & Communication Models
# ==============================================================================

class RoomMessage(models.Model):
    """
    Real-time chat message shared across Universal Movie and Music Rooms.
    Supports text, replies, reactions, system notices, and soft-deletion.
    """
    MESSAGE_TYPE_TEXT = 'text'
    MESSAGE_TYPE_SYSTEM = 'system'
    MESSAGE_TYPE_REPLY = 'reply'
    MESSAGE_TYPE_REACTION = 'reaction'
    MESSAGE_TYPE_MODERATION = 'moderation'
    MESSAGE_TYPE_CHOICES = [
        (MESSAGE_TYPE_TEXT, 'Text Message'),
        (MESSAGE_TYPE_SYSTEM, 'System Notification'),
        (MESSAGE_TYPE_REPLY, 'Reply Message'),
        (MESSAGE_TYPE_REACTION, 'Reaction Event'),
        (MESSAGE_TYPE_MODERATION, 'Moderation Notice'),
    ]

    MODERATION_STATUS_VISIBLE = 'visible'
    MODERATION_STATUS_FLAGGED = 'flagged'
    MODERATION_STATUS_REMOVED = 'removed'
    MODERATION_STATUS_CHOICES = [
        (MODERATION_STATUS_VISIBLE, 'Visible'),
        (MODERATION_STATUS_FLAGGED, 'Flagged'),
        (MODERATION_STATUS_REMOVED, 'Removed by Moderator'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='messages',
        db_index=True
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='room_messages',
        db_index=True
    )
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default=MESSAGE_TYPE_TEXT,
        db_index=True
    )
    content = models.TextField(max_length=2000)
    reply_to = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='replies'
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='deleted_room_messages'
    )
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    moderation_status = models.CharField(
        max_length=20,
        choices=MODERATION_STATUS_CHOICES,
        default=MODERATION_STATUS_VISIBLE,
        db_index=True
    )
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_room_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['room', 'created_at']),
            models.Index(fields=['room', 'is_deleted', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['moderation_status']),
        ]

    def __str__(self):
        sender_name = self.sender.username if self.sender else "System"
        return f"[{self.message_type}] {sender_name} in {self.room.name}: {self.content[:30]}"


class RoomMessageReaction(models.Model):
    """
    Emoji reactions attached to room messages.
    Guarantees unique reaction per (message, user, emoji).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        RoomMessage,
        on_delete=models.CASCADE,
        related_name='reactions',
        db_index=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_message_reactions',
        db_index=True
    )
    emoji = models.CharField(max_length=32)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mf_room_message_reactions'
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['message', 'user', 'emoji'],
                name='unique_user_message_emoji_reaction'
            )
        ]
        indexes = [
            models.Index(fields=['message', 'emoji']),
        ]

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} on {self.message_id}"


class RoomMessageReport(models.Model):
    """
    User reports against inappropriate messages or behavior in room chat.
    Auditable for moderators and administrators.
    """
    REASON_SPAM = 'spam'
    REASON_HARASSMENT = 'harassment'
    REASON_INAPPROPRIATE = 'inappropriate'
    REASON_HATE_SPEECH = 'hate_speech'
    REASON_OTHER = 'other'
    REASON_CHOICES = [
        (REASON_SPAM, 'Spam / Flooding'),
        (REASON_HARASSMENT, 'Harassment / Bullying'),
        (REASON_INAPPROPRIATE, 'Inappropriate Content'),
        (REASON_HATE_SPEECH, 'Hate Speech'),
        (REASON_OTHER, 'Other Violation'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_REVIEWED = 'reviewed'
    STATUS_DISMISSED = 'dismissed'
    STATUS_ACTION_TAKEN = 'action_taken'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_REVIEWED, 'Reviewed'),
        (STATUS_DISMISSED, 'Dismissed'),
        (STATUS_ACTION_TAKEN, 'Action Taken'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        RoomMessage,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reports'
    )
    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_reports_against'
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='filed_chat_reports'
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='message_reports'
    )
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    details = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_chat_reports'
    )
    resolution_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'mf_room_message_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"Report({self.reporter.username} -> {self.reported_user.username}: {self.reason})"


class RoomMute(models.Model):
    """
    Per-user room muting preferences.
    Muted rooms suppress push, in-app, and audio chat alerts for the user.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_mutes'
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='muted_by_users'
    )
    is_muted = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_room_mutes'
        constraints = [
            models.UniqueConstraint(fields=['user', 'room'], name='unique_user_room_mute')
        ]

    def __str__(self):
        return f"{self.user.username} muted Room {self.room_id}: {self.is_muted}"


class VoiceSession(models.Model):
    """
    Tracks an authoritative real-time voice communication session associated with a Room.
    Supports LiveKit SFU as the primary scalable media server with WebRTC mesh fallback.
    """
    PROVIDER_LIVEKIT = 'livekit'
    PROVIDER_WEBRTC_MESH = 'webrtc_mesh'
    PROVIDER_CHOICES = [
        (PROVIDER_LIVEKIT, 'LiveKit SFU'),
        (PROVIDER_WEBRTC_MESH, 'WebRTC Mesh'),
    ]

    STATUS_IDLE = 'idle'
    STATUS_STARTING = 'starting'
    STATUS_ACTIVE = 'active'
    STATUS_RECONNECTING = 'reconnecting'
    STATUS_ENDED = 'ended'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_IDLE, 'Idle'),
        (STATUS_STARTING, 'Starting'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_RECONNECTING, 'Reconnecting'),
        (STATUS_ENDED, 'Ended'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='voice_sessions'
    )
    provider = models.CharField(
        max_length=30,
        choices=PROVIDER_CHOICES,
        default=PROVIDER_LIVEKIT
    )
    provider_session_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Provider room/session identifier (e.g. LiveKit room name)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        db_index=True
    )
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='started_voice_sessions'
    )
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    video_enabled = models.BooleanField(
        default=True,
        help_text="Whether video publishing is enabled for this session"
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'mf_voice_sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['room', 'status']),
            models.Index(fields=['room', 'created_at']),
        ]

    def __str__(self):
        return f"VoiceSession({self.room.name} - {self.status} [{self.provider}])"


class VoiceParticipant(models.Model):
    """
    Represents an active or historical participant in a Room VoiceSession.
    Tracks connection status, microphone state, speaking indicators, and moderation state.
    """
    STATUS_CONNECTING = 'connecting'
    STATUS_CONNECTED = 'connected'
    STATUS_RECONNECTING = 'reconnecting'
    STATUS_DISCONNECTED = 'disconnected'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_CONNECTING, 'Connecting'),
        (STATUS_CONNECTED, 'Connected'),
        (STATUS_RECONNECTING, 'Reconnecting'),
        (STATUS_DISCONNECTED, 'Disconnected'),
        (STATUS_FAILED, 'Failed'),
    ]

    MIC_ACTIVE = 'active'
    MIC_MUTED = 'muted'
    MIC_DISABLED = 'disabled'
    MIC_CHOICES = [
        (MIC_ACTIVE, 'Active (Microphone Open)'),
        (MIC_MUTED, 'Muted (Self Muted)'),
        (MIC_DISABLED, 'Disabled (No Mic / Off)'),
    ]

    CAMERA_OFF = 'camera_off'
    CAMERA_STARTING = 'camera_starting'
    CAMERA_ON = 'camera_on'
    CAMERA_ERROR = 'camera_error'
    CAMERA_CHOICES = [
        (CAMERA_OFF, 'Camera Off'),
        (CAMERA_STARTING, 'Camera Starting'),
        (CAMERA_ON, 'Camera On'),
        (CAMERA_ERROR, 'Camera Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voice_session = models.ForeignKey(
        VoiceSession,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='voice_participations'
    )
    provider_participant_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Provider participant identifier (e.g. LiveKit participant identity or SID)"
    )
    connection_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CONNECTED,
        db_index=True
    )
    microphone_state = models.CharField(
        max_length=20,
        choices=MIC_CHOICES,
        default=MIC_MUTED
    )
    is_muted = models.BooleanField(
        default=True,
        help_text="Whether the participant is self-muted"
    )
    is_server_muted = models.BooleanField(
        default=False,
        help_text="Whether the participant was muted by a room host or co-host"
    )
    is_speaking = models.BooleanField(
        default=False,
        help_text="Real-time speaking indicator state"
    )

    # Video State (Phase 19)
    camera_state = models.CharField(
        max_length=20,
        choices=CAMERA_CHOICES,
        default=CAMERA_OFF,
        help_text="Real-time camera video state"
    )
    is_video_enabled = models.BooleanField(
        default=False,
        help_text="Whether camera video is actively publishing"
    )
    is_server_video_disabled = models.BooleanField(
        default=False,
        help_text="Whether participant video was disabled by host or co-host"
    )
    video_track_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Provider video track identifier"
    )
    joined_at = models.DateTimeField(default=timezone.now)
    left_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'mf_voice_participants'
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['voice_session', 'connection_status']),
            models.Index(fields=['user', 'connection_status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['voice_session', 'user'],
                name='unique_session_user_voice_participant'
            )
        ]

    def __str__(self):
        return f"{self.user.username} in {self.voice_session_id} ({self.connection_status}, mic: {self.microphone_state})"



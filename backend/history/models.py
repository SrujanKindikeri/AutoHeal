import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class WatchHistory(models.Model):
    """
    Persistent watch history tracking individual viewing progress across movies and TV episodes.
    Maintains exact timestamps, completion percentage, and resume points.
    """
    STATUS_NOT_STARTED = 'not_started'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_COMPLETED = 'completed'
    STATUS_ABANDONED = 'abandoned'

    STATUS_CHOICES = [
        (STATUS_NOT_STARTED, 'Not Started'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ABANDONED, 'Abandoned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watch_history'
    )
    content_type = models.CharField(
        max_length=20,
        choices=[('movie', 'Movie'), ('tv_show', 'TV Show')],
        default='movie'
    )
    content_id = models.CharField(max_length=255, db_index=True)
    content_title = models.CharField(max_length=500)
    content_artwork_url = models.URLField(max_length=1000, blank=True, default='')
    genres = models.JSONField(default=list, blank=True)

    # TV Series tracking
    series_id = models.CharField(max_length=255, blank=True, default='', db_index=True)
    series_title = models.CharField(max_length=500, blank=True, default='')
    season_number = models.PositiveIntegerField(null=True, blank=True)
    episode_number = models.PositiveIntegerField(null=True, blank=True)
    episode_title = models.CharField(max_length=500, blank=True, default='')

    # Provider & Session references
    provider_id = models.CharField(max_length=64, blank=True, default='')
    playback_session_id = models.CharField(max_length=64, blank=True, default='')
    room = models.ForeignKey(
        'rooms.Room',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='watch_histories'
    )

    # Playback Progress
    current_position_seconds = models.FloatField(default=0.0)
    duration_seconds = models.FloatField(default=0.0)
    completion_percentage = models.FloatField(default=0.0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_IN_PROGRESS,
        db_index=True
    )

    # Timestamps
    started_at = models.DateTimeField(default=timezone.now)
    last_watched_at = models.DateTimeField(default=timezone.now, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'mf_watch_history'
        ordering = ['-last_watched_at']
        indexes = [
            models.Index(fields=['user', '-last_watched_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'content_type', 'content_id']),
            models.Index(fields=['user', 'series_id']),
        ]

    def __str__(self):
        if self.content_type == 'tv_show' and self.season_number and self.episode_number:
            return f"{self.user.username} watched {self.series_title or self.content_title} S{self.season_number}E{self.episode_number} ({self.completion_percentage:.1f}%)"
        return f"{self.user.username} watched {self.content_title} ({self.completion_percentage:.1f}%)"

    def update_progress(self, position_seconds: float, duration_seconds: float = None):
        """Updates playback position, calculates completion, and updates status cleanly."""
        self.current_position_seconds = max(0.0, float(position_seconds))
        if duration_seconds and duration_seconds > 0:
            self.duration_seconds = float(duration_seconds)

        if self.duration_seconds > 0:
            pct = min(100.0, (self.current_position_seconds / self.duration_seconds) * 100.0)
            self.completion_percentage = round(pct, 1)

            # Rule: 90% completion or within 45 seconds of end marks as COMPLETED
            if pct >= 90.0 or (self.duration_seconds - self.current_position_seconds <= 45.0):
                self.status = self.STATUS_COMPLETED
                if not self.completed_at:
                    self.completed_at = timezone.now()
            elif pct > 0:
                self.status = self.STATUS_IN_PROGRESS
        else:
            if self.current_position_seconds > 0:
                self.status = self.STATUS_IN_PROGRESS

        self.last_watched_at = timezone.now()


class ListeningHistory(models.Model):
    """
    Persistent music listening history. Distinguishes accidental plays from meaningful listens.
    """
    STATUS_STARTED = 'started'
    STATUS_MEANINGFUL = 'meaningful_listen'
    STATUS_COMPLETED = 'completed'
    STATUS_SKIPPED = 'skipped'

    COMPLETION_CHOICES = [
        (STATUS_STARTED, 'Started'),
        (STATUS_MEANINGFUL, 'Meaningful Listen'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_SKIPPED, 'Skipped'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='listening_history'
    )
    track_mbid = models.CharField(max_length=64, db_index=True)
    track_title = models.CharField(max_length=500)
    artist_name = models.CharField(max_length=500)
    album_title = models.CharField(max_length=500, blank=True, default='')
    artwork_url = models.URLField(max_length=1000, blank=True, default='')
    genres = models.JSONField(default=list, blank=True)

    provider_id = models.CharField(max_length=64, blank=True, default='')
    playback_session_id = models.CharField(max_length=64, blank=True, default='')
    room = models.ForeignKey(
        'rooms.Room',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='listening_histories'
    )

    listening_duration_seconds = models.FloatField(default=0.0)
    playback_position_seconds = models.FloatField(default=0.0)
    track_duration_seconds = models.FloatField(default=0.0)
    completion_status = models.CharField(
        max_length=25,
        choices=COMPLETION_CHOICES,
        default=STATUS_STARTED,
        db_index=True
    )

    started_at = models.DateTimeField(default=timezone.now)
    last_played_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'mf_listening_history'
        ordering = ['-last_played_at']
        indexes = [
            models.Index(fields=['user', '-last_played_at']),
            models.Index(fields=['user', 'completion_status']),
            models.Index(fields=['user', 'track_mbid']),
            models.Index(fields=['user', 'artist_name']),
        ]

    def __str__(self):
        return f"{self.user.username} listened to {self.track_title} by {self.artist_name} ({self.completion_status})"

    def record_listen_time(self, duration_listened: float, position_seconds: float = None, track_duration: float = None):
        """
        Records actual cumulative listen duration and updates meaningful listening threshold.
        Rule: >= 30 seconds or >= 50% of track qualifies as meaningful listen.
        >= 85% qualifies as completed.
        """
        self.listening_duration_seconds = max(self.listening_duration_seconds, float(duration_listened))
        if position_seconds is not None:
            self.playback_position_seconds = float(position_seconds)
        if track_duration is not None and track_duration > 0:
            self.track_duration_seconds = float(track_duration)

        # Meaningful threshold logic
        if self.track_duration_seconds > 0:
            ratio = self.listening_duration_seconds / self.track_duration_seconds
            if ratio >= 0.85:
                self.completion_status = self.STATUS_COMPLETED
            elif ratio >= 0.50 or self.listening_duration_seconds >= 30.0:
                self.completion_status = self.STATUS_MEANINGFUL
            elif self.listening_duration_seconds < 10.0:
                self.completion_status = self.STATUS_SKIPPED
            else:
                self.completion_status = self.STATUS_STARTED
        else:
            if self.listening_duration_seconds >= 30.0:
                self.completion_status = self.STATUS_MEANINGFUL
            elif self.listening_duration_seconds < 10.0:
                self.completion_status = self.STATUS_SKIPPED
            else:
                self.completion_status = self.STATUS_STARTED

        self.last_played_at = timezone.now()


class RoomSessionHistory(models.Model):
    """
    Historical log of Universal Room entertainment sessions (MovieFlow Watch and MovieFlow Listen).
    Stored independently of personal consumption history so room attendance is not falsely treated
    as personal completion.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        'rooms.Room',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='session_history'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_session_history'
    )
    room_name = models.CharField(max_length=255)
    room_type = models.CharField(
        max_length=20,
        choices=[('movie', 'MovieFlow Watch'), ('music', 'MovieFlow Listen')]
    )
    content_type = models.CharField(max_length=30)
    content_id = models.CharField(max_length=255)
    content_title = models.CharField(max_length=500)
    content_artwork_url = models.URLField(max_length=1000, blank=True, default='')
    provider_name = models.CharField(max_length=100, blank=True, default='')

    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(default=0.0)
    participant_count = models.PositiveIntegerField(default=1)
    participants_snapshot = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'mf_room_session_history'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', '-started_at']),
            models.Index(fields=['room_type', '-started_at']),
        ]

    def __str__(self):
        return f"Room {self.room_name} ({self.room_type}) on {self.started_at.strftime('%Y-%m-%d')}"


class UserEntertainmentPreference(models.Model):
    """
    User entertainment personalization preferences and activity controls.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='entertainment_preferences'
    )
    preferred_movie_genres = models.JSONField(default=list, blank=True)
    preferred_music_genres = models.JSONField(default=list, blank=True)
    favorite_artists = models.JSONField(default=list, blank=True)
    preferred_languages = models.JSONField(default=list, blank=True)
    personalization_enabled = models.BooleanField(
        default=True,
        help_text="Master toggle for tailored recommendations across movies, TV, and music."
    )
    activity_recommendations_enabled = models.BooleanField(
        default=True,
        help_text="If False, recommendations rely exclusively on explicit preferences, not watch/listen logs."
    )
    autoplay_next_episode = models.BooleanField(
        default=False,
        help_text="If True, automatically progresses to the next episode in TV series."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mf_user_entertainment_preferences'

    def __str__(self):
        return f"Preferences of {self.user.username} (Personalization: {self.personalization_enabled})"


class RecommendationFeedback(models.Model):
    """
    Explicit user feedback signals on recommended or catalog content (like, dislike, not interested, hide).
    """
    ACTION_LIKE = 'like'
    ACTION_DISLIKE = 'dislike'
    ACTION_NOT_INTERESTED = 'not_interested'
    ACTION_SAVE = 'save'
    ACTION_HIDE = 'hide'
    ACTION_WATCHED = 'watched'

    ACTION_CHOICES = [
        (ACTION_LIKE, 'Like'),
        (ACTION_DISLIKE, 'Dislike'),
        (ACTION_NOT_INTERESTED, 'Not Interested'),
        (ACTION_SAVE, 'Save / Watchlist'),
        (ACTION_HIDE, 'Hide Content'),
        (ACTION_WATCHED, 'Mark as Watched'),
    ]

    CONTENT_TYPE_CHOICES = [
        ('movie', 'Movie'),
        ('tv_show', 'TV Show'),
        ('music_track', 'Music Track'),
        ('artist', 'Artist'),
        ('album', 'Album'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recommendation_feedback'
    )
    content_type = models.CharField(max_length=30, choices=CONTENT_TYPE_CHOICES)
    content_id = models.CharField(max_length=255)
    content_title = models.CharField(max_length=500, blank=True, default='')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mf_recommendation_feedback'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'content_type', 'content_id', 'action'],
                name='unique_user_content_action_feedback'
            )
        ]
        indexes = [
            models.Index(fields=['user', 'action']),
            models.Index(fields=['user', 'content_type']),
        ]

    def __str__(self):
        return f"{self.user.username} -> {self.action} on {self.content_type}:{self.content_id}"

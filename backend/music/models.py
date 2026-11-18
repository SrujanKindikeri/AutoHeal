import uuid
from django.db import models
from django.conf import settings


class MusicArtist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mbid = models.CharField(max_length=36, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    biography = models.TextField(blank=True)
    image_url = models.URLField(max_length=1000, blank=True)
    genres = models.JSONField(default=list)
    popularity = models.IntegerField(null=True, blank=True)
    metadata_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [models.Index(fields=['mbid']), models.Index(fields=['name'])]

    def __str__(self):
        return self.name


class MusicAlbum(models.Model):
    ALBUM_TYPES = [
        ('album', 'Album'),
        ('single', 'Single'),
        ('ep', 'EP'),
        ('compilation', 'Compilation'),
        ('other', 'Other'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mbid = models.CharField(max_length=36, unique=True, db_index=True)
    title = models.CharField(max_length=500)
    artist = models.ForeignKey(
        MusicArtist,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='albums',
    )
    release_date = models.DateField(null=True, blank=True)
    cover_art_url = models.URLField(max_length=1000, blank=True)
    album_type = models.CharField(max_length=20, choices=ALBUM_TYPES, default='album')
    track_count = models.IntegerField(default=0)
    metadata_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-release_date']
        indexes = [models.Index(fields=['mbid']), models.Index(fields=['release_date'])]

    def __str__(self):
        return self.title


class MusicTrack(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mbid = models.CharField(max_length=36, unique=True, db_index=True)
    title = models.CharField(max_length=500)
    artists = models.ManyToManyField(MusicArtist, blank=True, related_name='tracks')
    album = models.ForeignKey(
        MusicAlbum,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tracks',
    )
    duration_ms = models.IntegerField(default=0)
    track_number = models.IntegerField(null=True, blank=True)
    is_explicit = models.BooleanField(default=False)
    artwork_url = models.URLField(max_length=1000, blank=True)
    provider_metadata = models.JSONField(default=dict)
    metadata_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-metadata_updated_at']
        indexes = [models.Index(fields=['mbid']), models.Index(fields=['title'])]

    def __str__(self):
        return self.title


class Playlist(models.Model):
    VISIBILITY_PRIVATE = 'private'
    VISIBILITY_UNLISTED = 'unlisted'
    VISIBILITY_PUBLIC = 'public'
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
        ('public', 'Public'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='music_playlists',
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    artwork_url = models.URLField(max_length=1000, blank=True)
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Listen Together: when room models are implemented, add an optional playlist FK
    # (null=True, blank=True, on_delete=models.SET_NULL) on the room model pointing here.
    # Room creation API should validate the requesting user has at least viewer access.

    class Meta:
        ordering = ['-created_at', 'name']
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['visibility']),
        ]

    def __str__(self):
        return f'{self.owner} - {self.name}'


class PlaylistCollaborator(models.Model):
    """
    Grants a user access to a playlist.
    - editor: can add/remove/reorder tracks and edit metadata
    - viewer: read-only access to private/unlisted playlists
    Only the playlist owner can manage collaborators.
    The owner must not be added as a collaborator.
    """
    PERMISSION_EDITOR = 'editor'
    PERMISSION_VIEWER = 'viewer'
    PERMISSION_CHOICES = [
        ('editor', 'Editor'),
        ('viewer', 'Viewer'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        related_name='collaborators',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='playlist_collaborations',
    )
    permission = models.CharField(
        max_length=10,
        choices=PERMISSION_CHOICES,
        default=PERMISSION_VIEWER,
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['playlist', 'user'],
                name='unique_playlist_collaborator',
            )
        ]
        ordering = ['added_at']

    def __str__(self):
        return f'{self.playlist.name} - {self.user} ({self.permission})'


class PlaylistTrack(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    playlist = models.ForeignKey(
        Playlist,
        on_delete=models.CASCADE,
        related_name='playlist_tracks',
    )
    track_mbid = models.CharField(max_length=36)
    title = models.CharField(max_length=500)
    artist_name = models.CharField(max_length=500)
    album_name = models.CharField(max_length=500, blank=True)
    duration_ms = models.IntegerField(default=0)
    artwork_url = models.URLField(max_length=1000, blank=True)
    position = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('playlist', 'track_mbid')]
        ordering = ['position', 'added_at']

    def __str__(self):
        return f'{self.playlist.name} - {self.title}'

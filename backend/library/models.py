import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


CONTENT_TYPE_CHOICES = [
    ('movie', 'Movie'),
    ('tvshow', 'TV Show'),
    ('music_track', 'Music Track'),
    ('album', 'Album'),
    ('artist', 'Artist'),
]

MOVIE_STATUS_CHOICES = [
    ('watchlist', 'Watchlist'),
    ('watching', 'Watching'),
    ('watched', 'Watched'),
    ('favorites', 'Favorites'),
]

TVSHOW_STATUS_CHOICES = [
    ('plan_to_watch', 'Plan to Watch'),
    ('watching', 'Watching'),
    ('completed', 'Completed'),
    ('on_hold', 'On Hold'),
    ('dropped', 'Dropped'),
    ('favorites', 'Favorites'),
]

MUSIC_STATUS_CHOICES = [
    ('liked', 'Liked'),
    ('saved', 'Saved'),
]

# Map content type to valid statuses
VALID_STATUSES = {
    'movie': [c[0] for c in MOVIE_STATUS_CHOICES],
    'tvshow': [c[0] for c in TVSHOW_STATUS_CHOICES],
    'music_track': [c[0] for c in MUSIC_STATUS_CHOICES],
    'album': ['saved'],
    'artist': ['following'],
}

COLLECTION_PRIVACY_CHOICES = [
    ('public', 'Public'),
    ('private', 'Private'),
]


class UserLibraryItem(models.Model):
    """
    Tracks a user's relationship with any content item — movies, TV shows,
    music tracks, or albums.  status meaning differs by content_type, so
    validation is enforced at the serializer level.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='library_items',
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    # object_id stores the PK of the referenced object as a string so it
    # works with both integer (Movie/TVShow tmdb_id-based UUID) and UUID PKs.
    object_id = models.CharField(max_length=36, db_index=True)
    status = models.CharField(max_length=30)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    personal_rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
    )
    notes = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'library_items'
        ordering = ['-added_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'content_type', 'object_id'],
                name='unique_user_library_item',
            )
        ]
        indexes = [
            models.Index(fields=['user', 'content_type']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f'{self.user} — {self.content_type}:{self.object_id} [{self.status}]'


class UserCollection(models.Model):
    """A named, optionally public collection owned by a single user."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='collections',
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    cover_image_url = models.URLField(max_length=1000, blank=True, default='')
    privacy = models.CharField(
        max_length=10,
        choices=COLLECTION_PRIVACY_CHOICES,
        default='private',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'library_collections'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['owner'])]

    def __str__(self):
        return f'{self.owner} — {self.name}'


class CollectionItem(models.Model):
    """An item inside a UserCollection, with explicit ordering."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    collection = models.ForeignKey(
        UserCollection,
        on_delete=models.CASCADE,
        related_name='items',
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    object_id = models.CharField(max_length=36, db_index=True)
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'library_collection_items'
        ordering = ['position', 'added_at']
        constraints = [
            models.UniqueConstraint(
                fields=['collection', 'content_type', 'object_id'],
                name='unique_collection_item',
            )
        ]

    def __str__(self):
        return f'{self.collection.name} — {self.content_type}:{self.object_id}'


class UserFavorite(models.Model):
    """Quick-access favorites, independent of library status."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites',
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    object_id = models.CharField(max_length=36, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'library_favorites'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'content_type', 'object_id'],
                name='unique_user_favorite',
            )
        ]
        indexes = [models.Index(fields=['user', 'content_type'])]

    def __str__(self):
        return f'{self.user} ♥ {self.content_type}:{self.object_id}'


class UserFollow(models.Model):
    """
    Follow relationship between a user and a MusicArtist.
    Kept separate from UserLibraryItem so artist-following has its own
    clear semantic without polluting the item status choices.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='followed_artists',
    )
    # Store artist UUID as a string to avoid a hard FK on the music app,
    # keeping library decoupled.  The view validates that the artist exists.
    artist_id = models.CharField(max_length=36, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'library_artist_follows'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'artist_id'],
                name='unique_user_artist_follow',
            )
        ]

    def __str__(self):
        return f'{self.user} follows artist:{self.artist_id}'

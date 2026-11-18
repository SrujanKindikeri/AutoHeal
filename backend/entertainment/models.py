import uuid
from django.db import models
from django.conf import settings


class Genre(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=100)
    media_type = models.CharField(max_length=10, choices=[('movie', 'Movie'), ('tv', 'TV')])

    def __str__(self):
        return f'{self.name} ({self.media_type})'

    class Meta:
        ordering = ['name']


class Movie(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tmdb_id = models.IntegerField(unique=True, db_index=True)
    title = models.CharField(max_length=500)
    original_title = models.CharField(max_length=500)
    overview = models.TextField(blank=True)
    release_date = models.DateField(null=True, blank=True)
    runtime = models.IntegerField(null=True, blank=True)
    genres = models.ManyToManyField(Genre, blank=True, related_name='movies')
    original_language = models.CharField(max_length=10)
    poster_path = models.CharField(max_length=500, blank=True)
    backdrop_path = models.CharField(max_length=500, blank=True)
    vote_average = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    vote_count = models.IntegerField(default=0)
    popularity = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    adult = models.BooleanField(default=False)
    metadata_updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-popularity']
        indexes = [models.Index(fields=['tmdb_id']), models.Index(fields=['release_date'])]


class TVShow(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tmdb_id = models.IntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=500)
    original_name = models.CharField(max_length=500)
    overview = models.TextField(blank=True)
    first_air_date = models.DateField(null=True, blank=True)
    last_air_date = models.DateField(null=True, blank=True)
    genres = models.ManyToManyField(Genre, blank=True, related_name='tv_shows')
    poster_path = models.CharField(max_length=500, blank=True)
    backdrop_path = models.CharField(max_length=500, blank=True)
    vote_average = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    vote_count = models.IntegerField(default=0)
    popularity = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    original_language = models.CharField(max_length=10)
    metadata_updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-popularity']
        indexes = [models.Index(fields=['tmdb_id']), models.Index(fields=['first_air_date'])]


class WatchlistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='watchlist_items'
    )
    media_type = models.CharField(max_length=10, choices=[('movie', 'Movie'), ('tv', 'TV')])
    tmdb_id = models.IntegerField()
    title = models.CharField(max_length=500)
    poster_path = models.CharField(max_length=500, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('user', 'media_type', 'tmdb_id')]
        ordering = ['-added_at']

    def __str__(self):
        return f'{self.user} - {self.title}'

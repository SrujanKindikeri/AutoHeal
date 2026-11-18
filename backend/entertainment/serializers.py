"""
DRF serializers for the entertainment app.
"""

from rest_framework import serializers

from entertainment.models import Genre, Movie, TVShow, WatchlistItem

TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500"
TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/original"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _poster_url(path):
    return f"{TMDB_POSTER_BASE}{path}" if path else None


def _backdrop_url(path):
    return f"{TMDB_BACKDROP_BASE}{path}" if path else None


# ---------------------------------------------------------------------------
# Genre
# ---------------------------------------------------------------------------

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['id', 'tmdb_id', 'name', 'media_type']


# ---------------------------------------------------------------------------
# Movie
# ---------------------------------------------------------------------------

class MovieSerializer(serializers.ModelSerializer):
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()
    genres = GenreSerializer(many=True, read_only=True)

    class Meta:
        model = Movie
        fields = [
            'id',
            'tmdb_id',
            'title',
            'original_title',
            'overview',
            'release_date',
            'runtime',
            'genres',
            'original_language',
            'poster_path',
            'backdrop_path',
            'vote_average',
            'vote_count',
            'popularity',
            'adult',
            'metadata_updated_at',
            'poster_url',
            'backdrop_url',
        ]

    def get_poster_url(self, obj):
        return _poster_url(obj.poster_path)

    def get_backdrop_url(self, obj):
        return _backdrop_url(obj.backdrop_path)


# ---------------------------------------------------------------------------
# TVShow
# ---------------------------------------------------------------------------

class TVShowSerializer(serializers.ModelSerializer):
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()
    genres = GenreSerializer(many=True, read_only=True)

    class Meta:
        model = TVShow
        fields = [
            'id',
            'tmdb_id',
            'name',
            'original_name',
            'overview',
            'first_air_date',
            'last_air_date',
            'genres',
            'poster_path',
            'backdrop_path',
            'vote_average',
            'vote_count',
            'popularity',
            'original_language',
            'metadata_updated_at',
            'poster_url',
            'backdrop_url',
        ]

    def get_poster_url(self, obj):
        return _poster_url(obj.poster_path)

    def get_backdrop_url(self, obj):
        return _backdrop_url(obj.backdrop_path)


# ---------------------------------------------------------------------------
# WatchlistItem
# ---------------------------------------------------------------------------

class WatchlistItemSerializer(serializers.ModelSerializer):
    poster_url = serializers.SerializerMethodField()

    class Meta:
        model = WatchlistItem
        fields = [
            'id',
            'media_type',
            'tmdb_id',
            'title',
            'poster_path',
            'poster_url',
            'added_at',
        ]

    def get_poster_url(self, obj):
        return _poster_url(obj.poster_path)


# ---------------------------------------------------------------------------
# TMDB raw-dict serializers (plain Serializer, not ModelSerializer)
# ---------------------------------------------------------------------------

class TMDBMovieSerializer(serializers.Serializer):
    """Serializes raw TMDB movie dicts returned by the discovery/search API."""
    id = serializers.IntegerField(source='tmdb_id', read_only=True, default=None)
    tmdb_id = serializers.IntegerField(source='id')
    title = serializers.CharField()
    original_title = serializers.CharField()
    overview = serializers.CharField(allow_blank=True)
    release_date = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    poster_path = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    backdrop_path = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    vote_average = serializers.FloatField()
    vote_count = serializers.IntegerField()
    popularity = serializers.FloatField()
    adult = serializers.BooleanField()
    original_language = serializers.CharField()
    genre_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()

    def get_poster_url(self, obj):
        return _poster_url(obj.get('poster_path') or '')

    def get_backdrop_url(self, obj):
        return _backdrop_url(obj.get('backdrop_path') or '')

    def to_representation(self, instance):
        # Remap 'id' → 'tmdb_id' so the response field is named consistently.
        ret = super().to_representation(instance)
        ret['tmdb_id'] = instance.get('id')
        ret.pop('id', None)
        return ret


class TMDBTVSerializer(serializers.Serializer):
    """Serializes raw TMDB TV-show dicts returned by the discovery/search API."""
    tmdb_id = serializers.IntegerField(source='id')
    name = serializers.CharField()
    original_name = serializers.CharField()
    overview = serializers.CharField(allow_blank=True)
    first_air_date = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    poster_path = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    backdrop_path = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    vote_average = serializers.FloatField()
    vote_count = serializers.IntegerField()
    popularity = serializers.FloatField()
    original_language = serializers.CharField()
    genre_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    poster_url = serializers.SerializerMethodField()
    backdrop_url = serializers.SerializerMethodField()

    def get_poster_url(self, obj):
        return _poster_url(obj.get('poster_path') or '')

    def get_backdrop_url(self, obj):
        return _backdrop_url(obj.get('backdrop_path') or '')

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['tmdb_id'] = instance.get('id')
        return ret

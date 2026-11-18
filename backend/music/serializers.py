"""
DRF serializers for the music app.
"""

from django.db.models import Sum
from rest_framework import serializers

from music.models import MusicAlbum, MusicArtist, MusicTrack, Playlist, PlaylistCollaborator, PlaylistTrack


# ---------------------------------------------------------------------------
# Model serializers
# ---------------------------------------------------------------------------

class MusicArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = MusicArtist
        fields = [
            'id',
            'mbid',
            'name',
            'biography',
            'image_url',
            'genres',
            'popularity',
            'metadata_updated_at',
        ]


class MusicAlbumSerializer(serializers.ModelSerializer):
    artist = MusicArtistSerializer(read_only=True)

    class Meta:
        model = MusicAlbum
        fields = [
            'id',
            'mbid',
            'title',
            'artist',
            'release_date',
            'cover_art_url',
            'album_type',
            'track_count',
            'metadata_updated_at',
        ]


class MusicTrackSerializer(serializers.ModelSerializer):
    artists = MusicArtistSerializer(many=True, read_only=True)
    album = MusicAlbumSerializer(read_only=True)

    class Meta:
        model = MusicTrack
        fields = [
            'id',
            'mbid',
            'title',
            'artists',
            'album',
            'duration_ms',
            'track_number',
            'is_explicit',
            'artwork_url',
            'provider_metadata',
            'metadata_updated_at',
        ]


class PlaylistTrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaylistTrack
        fields = [
            'id',
            'track_mbid',
            'title',
            'artist_name',
            'album_name',
            'duration_ms',
            'artwork_url',
            'position',
            'added_at',
        ]


class PlaylistSerializer(serializers.ModelSerializer):
    """Summary serializer — used for list views and playlist cards."""
    track_count = serializers.SerializerMethodField()
    total_duration_seconds = serializers.SerializerMethodField()
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Playlist
        fields = [
            'id',
            'owner_username',
            'name',
            'description',
            'artwork_url',
            'visibility',
            'track_count',
            'total_duration_seconds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner_username', 'created_at', 'updated_at']

    def get_track_count(self, obj) -> int:
        return obj.playlist_tracks.count()

    def get_total_duration_seconds(self, obj) -> int:
        total_ms = obj.playlist_tracks.aggregate(total=Sum('duration_ms'))['total'] or 0
        return total_ms // 1000


class PlaylistDetailSerializer(serializers.ModelSerializer):
    """Detail serializer — includes full track listing."""
    tracks = PlaylistTrackSerializer(source='playlist_tracks', many=True, read_only=True)
    track_count = serializers.SerializerMethodField()
    total_duration_seconds = serializers.SerializerMethodField()
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Playlist
        fields = [
            'id',
            'owner_username',
            'name',
            'description',
            'artwork_url',
            'visibility',
            'track_count',
            'total_duration_seconds',
            'tracks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner_username', 'created_at', 'updated_at']

    def get_track_count(self, obj) -> int:
        return obj.playlist_tracks.count()

    def get_total_duration_seconds(self, obj) -> int:
        total_ms = obj.playlist_tracks.aggregate(total=Sum('duration_ms'))['total'] or 0
        return total_ms // 1000


class PlaylistCollaboratorSerializer(serializers.ModelSerializer):
    """Serializes a PlaylistCollaborator with the collaborating user's public info."""
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = PlaylistCollaborator
        fields = ['id', 'user_id', 'username', 'permission', 'added_at']
        read_only_fields = ['id', 'user_id', 'username', 'added_at']


# ---------------------------------------------------------------------------
# MusicBrainz raw-dict serializers (plain Serializer, not ModelSerializer)
# ---------------------------------------------------------------------------

class MBRecordingSerializer(serializers.Serializer):
    """Serializes raw MusicBrainz recording (track) dicts."""

    mbid = serializers.SerializerMethodField()
    title = serializers.CharField(default='')
    duration_ms = serializers.SerializerMethodField()
    is_explicit = serializers.SerializerMethodField()
    artists = serializers.SerializerMethodField()
    album = serializers.SerializerMethodField()
    artwork_url = serializers.SerializerMethodField()
    genres = serializers.SerializerMethodField()

    def get_mbid(self, obj):
        return obj.get('id', '')

    def get_duration_ms(self, obj):
        return obj.get('length') or 0

    def get_is_explicit(self, obj):
        return False  # MusicBrainz does not expose explicit flags in this endpoint

    def get_artists(self, obj):
        credits = obj.get('artist-credit', [])
        result = []
        for credit in credits:
            if isinstance(credit, dict) and 'artist' in credit:
                artist = credit['artist']
                result.append({
                    'mbid': artist.get('id', ''),
                    'name': artist.get('name', credit.get('name', '')),
                })
        return result

    def get_album(self, obj):
        releases = obj.get('releases', [])
        if not releases:
            return None
        r = releases[0]
        return {
            'mbid': r.get('id', ''),
            'title': r.get('title', ''),
            'cover_art_url': r.get('cover_art_url', None),
        }

    def get_artwork_url(self, obj):
        return obj.get('cover_art_url', None)

    def get_genres(self, obj):
        tags = obj.get('tags', [])
        return [t.get('name', '') for t in tags if t.get('name')]


class MBReleaseGroupSerializer(serializers.Serializer):
    """Serializes raw MusicBrainz release-group (album) dicts."""

    mbid = serializers.SerializerMethodField()
    title = serializers.CharField(default='')
    album_type = serializers.SerializerMethodField()
    release_date = serializers.SerializerMethodField()
    cover_art_url = serializers.SerializerMethodField()
    artists = serializers.SerializerMethodField()
    genres = serializers.SerializerMethodField()

    def get_mbid(self, obj):
        return obj.get('id', '')

    def get_album_type(self, obj):
        raw = (obj.get('primary-type') or '').lower()
        type_map = {
            'album': 'album',
            'single': 'single',
            'ep': 'ep',
            'compilation': 'compilation',
        }
        return type_map.get(raw, 'other')

    def get_release_date(self, obj):
        return obj.get('first-release-date') or None

    def get_cover_art_url(self, obj):
        return obj.get('cover_art_url', None)

    def get_artists(self, obj):
        credits = obj.get('artist-credit', [])
        result = []
        for credit in credits:
            if isinstance(credit, dict) and 'artist' in credit:
                artist = credit['artist']
                result.append({
                    'mbid': artist.get('id', ''),
                    'name': artist.get('name', credit.get('name', '')),
                })
        return result

    def get_genres(self, obj):
        tags = obj.get('tags', [])
        return [t.get('name', '') for t in tags if t.get('name')]


class MBArtistSerializer(serializers.Serializer):
    """Serializes raw MusicBrainz artist dicts."""

    mbid = serializers.SerializerMethodField()
    name = serializers.CharField(default='')
    sort_name = serializers.SerializerMethodField()
    genres = serializers.SerializerMethodField()
    disambiguation = serializers.SerializerMethodField()

    def get_mbid(self, obj):
        return obj.get('id', '')

    def get_sort_name(self, obj):
        return obj.get('sort-name', '')

    def get_genres(self, obj):
        tags = obj.get('tags', [])
        return [t.get('name', '') for t in tags if t.get('name')]

    def get_disambiguation(self, obj):
        return obj.get('disambiguation', '')

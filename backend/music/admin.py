from django.contrib import admin

from music.models import MusicAlbum, MusicArtist, MusicTrack, Playlist, PlaylistTrack


@admin.register(MusicArtist)
class MusicArtistAdmin(admin.ModelAdmin):
    list_display = ['name', 'mbid', 'metadata_updated_at']
    search_fields = ['name', 'mbid']


@admin.register(MusicAlbum)
class MusicAlbumAdmin(admin.ModelAdmin):
    list_display = ['title', 'mbid', 'album_type', 'release_date', 'metadata_updated_at']
    search_fields = ['title', 'mbid']
    list_filter = ['album_type']


@admin.register(MusicTrack)
class MusicTrackAdmin(admin.ModelAdmin):
    list_display = ['title', 'mbid', 'duration_ms', 'metadata_updated_at']
    search_fields = ['title', 'mbid']


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'created_at', 'updated_at']
    search_fields = ['name', 'owner__username']


@admin.register(PlaylistTrack)
class PlaylistTrackAdmin(admin.ModelAdmin):
    list_display = ['title', 'artist_name', 'playlist', 'position', 'added_at']
    search_fields = ['title', 'artist_name', 'track_mbid']
    list_filter = ['playlist']

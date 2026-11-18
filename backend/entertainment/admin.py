from django.contrib import admin
from .models import Genre, Movie, TVShow, WatchlistItem


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ['name', 'media_type', 'tmdb_id']
    list_filter = ['media_type']
    search_fields = ['name']


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ['title', 'release_date', 'vote_average', 'popularity', 'adult', 'metadata_updated_at']
    list_filter = ['adult', 'original_language']
    search_fields = ['title', 'original_title']
    filter_horizontal = ['genres']
    readonly_fields = ['id', 'metadata_updated_at']


@admin.register(TVShow)
class TVShowAdmin(admin.ModelAdmin):
    list_display = ['name', 'first_air_date', 'last_air_date', 'vote_average', 'popularity', 'metadata_updated_at']
    list_filter = ['original_language']
    search_fields = ['name', 'original_name']
    filter_horizontal = ['genres']
    readonly_fields = ['id', 'metadata_updated_at']


@admin.register(WatchlistItem)
class WatchlistItemAdmin(admin.ModelAdmin):
    list_display = ['user', 'title', 'media_type', 'tmdb_id', 'added_at']
    list_filter = ['media_type']
    search_fields = ['title', 'user__username']
    readonly_fields = ['id', 'added_at']

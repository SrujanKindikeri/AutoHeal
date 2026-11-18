from django.urls import path
from . import views

urlpatterns = [
    # -----------------------------------------------------------------------
    # Music discovery (public)
    # -----------------------------------------------------------------------
    path('music/trending/', views.MusicTrendingView.as_view(), name='music-trending'),
    path('music/popular/', views.MusicPopularArtistsView.as_view(), name='music-popular'),
    path('music/new-releases/', views.MusicNewReleasesView.as_view(), name='music-new-releases'),
    path('music/genres/', views.MusicGenresView.as_view(), name='music-genres'),
    path('music/search/', views.MusicSearchView.as_view(), name='music-search'),
    path('music/tracks/<str:track_id>/', views.MusicTrackDetailView.as_view(), name='music-track-detail'),
    path('music/albums/<str:album_id>/', views.MusicAlbumDetailView.as_view(), name='music-album-detail'),
    path('music/artists/<str:artist_id>/', views.MusicArtistDetailView.as_view(), name='music-artist-detail'),
    path('music/artists/<str:artist_id>/albums/', views.MusicArtistAlbumsView.as_view(), name='music-artist-albums'),
    path('music/artists/<str:artist_id>/top-tracks/', views.MusicArtistTopTracksView.as_view(), name='music-artist-top-tracks'),

    # -----------------------------------------------------------------------
    # Playlists
    # Note: static segments (discover) must come before <uuid:playlist_id>
    # -----------------------------------------------------------------------
    path('music/playlists/', views.PlaylistListCreateView.as_view(), name='music-playlist-list-create'),
    path('music/playlists/discover/', views.PlaylistDiscoverView.as_view(), name='music-playlist-discover'),

    # Playlist detail + operations
    path('music/playlists/<uuid:playlist_id>/', views.PlaylistDetailView.as_view(), name='music-playlist-detail'),
    path('music/playlists/<uuid:playlist_id>/duplicate/', views.PlaylistDuplicateView.as_view(), name='music-playlist-duplicate'),
    path('music/playlists/<uuid:playlist_id>/reorder/', views.PlaylistReorderView.as_view(), name='music-playlist-reorder'),
    path('music/playlists/<uuid:playlist_id>/share/', views.PlaylistShareView.as_view(), name='music-playlist-share'),

    # Tracks
    path('music/playlists/<uuid:playlist_id>/tracks/', views.PlaylistTrackView.as_view(), name='music-playlist-tracks'),
    path('music/playlists/<uuid:playlist_id>/tracks/<str:track_mbid>/', views.PlaylistTrackView.as_view(), name='music-playlist-track-detail'),
    path('music/playlists/<uuid:playlist_id>/tracks/<str:track_mbid>/reorder/', views.PlaylistTrackReorderView.as_view(), name='music-playlist-track-reorder'),

    # Collaborators
    path('music/playlists/<uuid:playlist_id>/collaborators/', views.PlaylistCollaboratorListCreateView.as_view(), name='music-playlist-collaborators'),
    path('music/playlists/<uuid:playlist_id>/collaborators/<uuid:user_id>/', views.PlaylistCollaboratorDetailView.as_view(), name='music-playlist-collaborator-detail'),
]

from django.urls import path
from . import views

urlpatterns = [
    # Library overview and sub-lists
    path('library/', views.LibraryOverviewView.as_view(), name='library-overview'),
    path('library/movies/', views.LibraryMoviesView.as_view(), name='library-movies'),
    path('library/shows/', views.LibraryShowsView.as_view(), name='library-shows'),
    path('library/music/', views.LibraryMusicView.as_view(), name='library-music'),

    # Library items CRUD
    path('library/items/', views.LibraryItemListCreateView.as_view(), name='library-items'),
    path('library/items/<uuid:item_id>/', views.LibraryItemDetailView.as_view(), name='library-item-detail'),

    # Collections
    path('collections/', views.CollectionListCreateView.as_view(), name='collection-list-create'),
    path('collections/<uuid:collection_id>/', views.CollectionDetailView.as_view(), name='collection-detail'),
    path('collections/<uuid:collection_id>/items/', views.CollectionItemCreateView.as_view(), name='collection-item-create'),
    path('collections/<uuid:collection_id>/items/<uuid:item_id>/', views.CollectionItemDeleteView.as_view(), name='collection-item-delete'),
    path('collections/<uuid:collection_id>/reorder/', views.CollectionReorderView.as_view(), name='collection-reorder'),

    # Favorites
    path('favorites/', views.FavoriteListCreateView.as_view(), name='favorites'),
    path('favorites/<uuid:favorite_id>/', views.FavoriteDetailView.as_view(), name='favorite-detail'),

    # Artist follows (under music namespace for consistency)
    path('music/following/artists/', views.ArtistFollowListCreateView.as_view(), name='artist-follows'),
    path('music/following/artists/<uuid:artist_id>/', views.ArtistFollowDeleteView.as_view(), name='artist-follow-delete'),

    # Personal media uploads (DISTINCT prefix — no collision with library/movies etc.)
    path('library/uploads/movies/', views.UploadedMovieListCreateView.as_view(), name='uploads-movies-list'),
    path('library/uploads/movies/<uuid:movie_id>/', views.UploadedMovieDetailView.as_view(), name='uploads-movies-detail'),
    path('library/uploads/movies/<uuid:movie_id>/stream/', views.UploadedMovieStreamView.as_view(), name='uploads-movies-stream'),
    path('library/uploads/tracks/', views.UploadedTrackListCreateView.as_view(), name='uploads-tracks-list'),
    path('library/uploads/tracks/<uuid:track_id>/', views.UploadedTrackDetailView.as_view(), name='uploads-tracks-detail'),
    path('library/uploads/tracks/<uuid:track_id>/stream/', views.UploadedTrackStreamView.as_view(), name='uploads-tracks-stream'),
]

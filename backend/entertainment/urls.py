from django.urls import path
from . import views

urlpatterns = [
    # Movies
    path('movies/trending/', views.MovieTrendingView.as_view(), name='movies-trending'),
    path('movies/popular/', views.MoviePopularView.as_view(), name='movies-popular'),
    path('movies/top-rated/', views.MovieTopRatedView.as_view(), name='movies-top-rated'),
    path('movies/now-playing/', views.MovieNowPlayingView.as_view(), name='movies-now-playing'),
    path('movies/upcoming/', views.MovieUpcomingView.as_view(), name='movies-upcoming'),
    path('movies/<int:movie_id>/', views.MovieDetailView.as_view(), name='movie-detail'),
    # TV
    path('tv/trending/', views.TVTrendingView.as_view(), name='tv-trending'),
    path('tv/popular/', views.TVPopularView.as_view(), name='tv-popular'),
    path('tv/top-rated/', views.TVTopRatedView.as_view(), name='tv-top-rated'),
    path('tv/on-the-air/', views.TVOnTheAirView.as_view(), name='tv-on-the-air'),
    path('tv/<int:show_id>/', views.TVDetailView.as_view(), name='tv-detail'),
    # Entertainment
    path('entertainment/search/', views.SearchView.as_view(), name='entertainment-search'),
    path('entertainment/genres/', views.GenreListView.as_view(), name='entertainment-genres'),
    path('entertainment/discover/', views.DiscoverView.as_view(), name='entertainment-discover'),
    path('entertainment/watchlist/', views.WatchlistListCreateView.as_view(), name='watchlist-list-create'),
    path('entertainment/watchlist/<uuid:id>/', views.WatchlistDeleteView.as_view(), name='watchlist-delete'),
]

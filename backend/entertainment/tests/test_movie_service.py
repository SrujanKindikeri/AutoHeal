"""
Tests for entertainment.services.movie_service.
All tmdb_client.get calls and cache operations are mocked.
"""

from unittest.mock import patch, MagicMock

from django.test import TestCase

from entertainment.services import movie_service


MOCK_RESULTS_PAGE = {
    'page': 1,
    'total_pages': 1,
    'total_results': 2,
    'results': [
        {'id': 1, 'title': 'Clean Movie', 'adult': False},
        {'id': 2, 'title': 'Adult Movie', 'adult': True},
    ],
}

MOCK_DETAIL = {
    'id': 99,
    'title': 'Some Movie',
    'adult': False,
}


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetTrendingMovies(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_trending_movies()
        self.assertIn('results', result)

    def test_filters_adult_items(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_trending_movies()
        for item in result['results']:
            self.assertFalse(item.get('adult', False))


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetPopularMovies(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_popular_movies()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetTopRatedMovies(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_top_rated_movies()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetNowPlayingMovies(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_now_playing_movies()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetUpcomingMovies(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = movie_service.get_upcoming_movies()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.movie_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetMovieDetail(TestCase):
    def test_returns_dict_with_matching_id(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_DETAIL)
        result = movie_service.get_movie_detail(99)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['id'], 99)

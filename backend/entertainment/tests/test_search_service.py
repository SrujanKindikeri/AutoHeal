"""
Tests for entertainment.services.search_service.
All tmdb_client.get calls and cache operations are mocked.
"""

from unittest.mock import patch, call

from django.test import TestCase

from entertainment.services import search_service


MOCK_MOVIE_RESULTS = {
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
    'results': [{'id': 1, 'title': 'The Matrix', 'adult': False}],
}

MOCK_TV_RESULTS = {
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
    'results': [{'id': 10, 'name': 'Breaking Bad', 'adult': False}],
}

MOCK_MULTI_RESULTS = {
    'page': 1,
    'total_pages': 1,
    'total_results': 3,
    'results': [
        {'id': 1, 'media_type': 'movie', 'title': 'Inception', 'adult': False},
        {'id': 2, 'media_type': 'tv', 'name': 'Westworld', 'adult': False},
        {'id': 3, 'media_type': 'person', 'name': 'Brad Pitt', 'adult': False},
    ],
}

MOCK_GENRES = {
    'genres': [
        {'id': 28, 'name': 'Action'},
        {'id': 12, 'name': 'Adventure'},
    ]
}

MOCK_DISCOVER_RESULTS = {
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
    'results': [{'id': 5, 'title': 'Discovered Movie', 'adult': False}],
}


@patch('entertainment.services.search_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestSearchMovies(TestCase):
    def test_returns_results(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_MOVIE_RESULTS)
        result = search_service.search_movies('matrix')
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)

    def test_short_query_raises_value_error(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        with self.assertRaises(ValueError):
            search_service.search_movies('a')

    def test_empty_query_raises_value_error(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        with self.assertRaises(ValueError):
            search_service.search_movies('')


@patch('entertainment.services.search_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestSearchTV(TestCase):
    def test_returns_results(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_TV_RESULTS)
        result = search_service.search_tv('breaking')
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)
        self.assertEqual(result['results'][0]['id'], 10)


@patch('entertainment.services.search_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestSearchMulti(TestCase):
    def test_filters_person_entries(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_MULTI_RESULTS)
        result = search_service.search_multi('inception')
        media_types = [item['media_type'] for item in result['results']]
        self.assertNotIn('person', media_types)

    def test_returns_movies_and_tv(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_MULTI_RESULTS)
        result = search_service.search_multi('inception')
        self.assertEqual(len(result['results']), 2)


@patch('entertainment.services.search_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetGenres(TestCase):
    def test_returns_genre_dicts(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_GENRES)
        result = search_service.get_genres('movie')
        self.assertIn('genres', result)
        self.assertIsInstance(result['genres'], list)
        self.assertGreater(len(result['genres']), 0)
        self.assertIn('id', result['genres'][0])
        self.assertIn('name', result['genres'][0])

    def test_tv_genres(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_GENRES)
        result = search_service.get_genres('tv')
        self.assertIn('genres', result)

    def test_invalid_media_type_raises(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        with self.assertRaises(ValueError):
            search_service.get_genres('music')


@patch('entertainment.services.search_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestDiscoverMedia(TestCase):
    def test_always_passes_adult_false(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_DISCOVER_RESULTS)
        search_service.discover_media(media_type='movie')
        # Inspect the params passed to tmdb_client.get
        call_kwargs = mock_tmdb_get.call_args
        # get(endpoint, params=...) — could be positional or keyword
        if call_kwargs.kwargs.get('params'):
            params = call_kwargs.kwargs['params']
        else:
            params = call_kwargs.args[1] if len(call_kwargs.args) > 1 else call_kwargs.kwargs.get('params', {})
        self.assertEqual(params.get('include_adult'), 'false')

    def test_returns_results(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_DISCOVER_RESULTS)
        result = search_service.discover_media(media_type='movie')
        self.assertIn('results', result)

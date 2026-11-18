"""
Tests for entertainment.services.tv_service.
All tmdb_client.get calls and cache operations are mocked.
"""

from unittest.mock import patch

from django.test import TestCase

from entertainment.services import tv_service


MOCK_RESULTS_PAGE = {
    'page': 1,
    'total_pages': 1,
    'total_results': 2,
    'results': [
        {'id': 10, 'name': 'Clean Show', 'adult': False},
        {'id': 11, 'name': 'Adult Show', 'adult': True},
    ],
}

MOCK_DETAIL = {
    'id': 55,
    'name': 'Some Show',
    'adult': False,
}


@patch('entertainment.services.tv_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetTrendingTV(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = tv_service.get_trending_tv()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)

    def test_filters_adult_items(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = tv_service.get_trending_tv()
        for item in result['results']:
            self.assertFalse(item.get('adult', False))


@patch('entertainment.services.tv_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetPopularTV(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = tv_service.get_popular_tv()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.tv_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetTopRatedTV(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = tv_service.get_top_rated_tv()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.tv_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetOnTheAirTV(TestCase):
    def test_returns_results_list(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_RESULTS_PAGE)
        result = tv_service.get_on_the_air_tv()
        self.assertIn('results', result)
        self.assertIsInstance(result['results'], list)


@patch('entertainment.services.tv_service.tmdb_client.get')
@patch('django.core.cache.cache.set')
@patch('django.core.cache.cache.get', return_value=None)
class TestGetTVDetail(TestCase):
    def test_returns_dict_with_matching_id(self, mock_cache_get, mock_cache_set, mock_tmdb_get):
        mock_tmdb_get.return_value = dict(MOCK_DETAIL)
        result = tv_service.get_tv_detail(55)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['id'], 55)

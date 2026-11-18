"""
Tests for entertainment views using DRF APIClient.
Service layer functions are mocked; no TMDB HTTP calls are made.
"""

from unittest.mock import patch, MagicMock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from entertainment.services.tmdb_client import TMDBError


# ---------------------------------------------------------------------------
# Shared fixture data
# ---------------------------------------------------------------------------

def _movie_page():
    return {
        'page': 1,
        'total_pages': 1,
        'total_results': 1,
        'results': [
            {
                'id': 1,
                'title': 'Test Movie',
                'original_title': 'Test Movie',
                'overview': 'An overview.',
                'release_date': '2024-01-01',
                'poster_path': '/test.jpg',
                'backdrop_path': '/back.jpg',
                'vote_average': 7.5,
                'vote_count': 100,
                'popularity': 50.0,
                'adult': False,
                'original_language': 'en',
                'genre_ids': [28],
            }
        ],
    }


def _tv_page():
    return {
        'page': 1,
        'total_pages': 1,
        'total_results': 1,
        'results': [
            {
                'id': 10,
                'name': 'Test Show',
                'original_name': 'Test Show',
                'overview': 'An overview.',
                'first_air_date': '2024-01-01',
                'poster_path': '/test.jpg',
                'backdrop_path': '/back.jpg',
                'vote_average': 8.0,
                'vote_count': 200,
                'popularity': 60.0,
                'original_language': 'en',
                'genre_ids': [18],
            }
        ],
    }


# ---------------------------------------------------------------------------
# MovieTrendingView
# ---------------------------------------------------------------------------

class MovieTrendingViewTests(APITestCase):
    @patch('entertainment.views.movie_service.get_trending_movies', return_value=_movie_page())
    def test_get_returns_200(self, mock_svc):
        url = reverse('movies-trending')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('entertainment.views.movie_service.get_trending_movies', return_value=_movie_page())
    def test_response_has_results_key(self, mock_svc):
        url = reverse('movies-trending')
        response = self.client.get(url)
        self.assertIn('results', response.data)

    @patch('entertainment.views.movie_service.get_trending_movies', return_value=_movie_page())
    def test_pagination_params_accepted(self, mock_svc):
        url = reverse('movies-trending')
        response = self.client.get(url, {'page': 2, 'page_size': 10})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# MovieDetailView
# ---------------------------------------------------------------------------

class MovieDetailViewTests(APITestCase):
    @patch('entertainment.views.movie_service.get_movie_detail', return_value={'id': 42, 'title': 'Detail'})
    def test_valid_id_returns_200(self, mock_svc):
        url = reverse('movie-detail', kwargs={'movie_id': 42})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch(
        'entertainment.views.movie_service.get_movie_detail',
        side_effect=TMDBError('Not found', status_code=404),
    )
    def test_404_tmdb_error_returns_404(self, mock_svc):
        url = reverse('movie-detail', kwargs={'movie_id': 9999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# TVTrendingView
# ---------------------------------------------------------------------------

class TVTrendingViewTests(APITestCase):
    @patch('entertainment.views.tv_service.get_trending_tv', return_value=_tv_page())
    def test_get_returns_200(self, mock_svc):
        url = reverse('tv-trending')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('entertainment.views.tv_service.get_trending_tv', return_value=_tv_page())
    def test_response_has_results_key(self, mock_svc):
        url = reverse('tv-trending')
        response = self.client.get(url)
        self.assertIn('results', response.data)


# ---------------------------------------------------------------------------
# SearchView
# ---------------------------------------------------------------------------

SEARCH_RESULT = {
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
    'results': [
        {
            'id': 1,
            'title': 'Avengers',
            'original_title': 'Avengers',
            'overview': 'Heroes.',
            'release_date': '2012-05-04',
            'poster_path': None,
            'backdrop_path': None,
            'vote_average': 8.0,
            'vote_count': 5000,
            'popularity': 100.0,
            'adult': False,
            'original_language': 'en',
            'genre_ids': [28],
        }
    ],
}


class SearchViewTests(APITestCase):
    @patch('entertainment.views.search_service.search_movies', return_value=SEARCH_RESULT)
    def test_valid_query_returns_200(self, mock_svc):
        url = reverse('entertainment-search')
        response = self.client.get(url, {'q': 'ab', 'type': 'movie'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_single_char_query_returns_400(self):
        url = reverse('entertainment-search')
        response = self.client.get(url, {'q': 'a'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_query_returns_400(self):
        url = reverse('entertainment-search')
        response = self.client.get(url, {'q': ''})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# GenreListView
# ---------------------------------------------------------------------------

GENRE_RESPONSE = {'genres': [{'id': 28, 'name': 'Action'}]}


class GenreListViewTests(APITestCase):
    @patch('entertainment.views.search_service.get_genres', return_value=GENRE_RESPONSE)
    def test_movie_type_returns_200_list(self, mock_svc):
        url = reverse('entertainment-genres')
        response = self.client.get(url, {'type': 'movie'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('genres', response.data)

    def test_missing_type_returns_400(self):
        url = reverse('entertainment-genres')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# DiscoverView
# ---------------------------------------------------------------------------

DISCOVER_RESULT = {
    'page': 1,
    'total_pages': 1,
    'total_results': 1,
    'results': [
        {
            'id': 7,
            'title': 'Discover Movie',
            'original_title': 'Discover Movie',
            'overview': 'Found.',
            'release_date': '2023-01-01',
            'poster_path': None,
            'backdrop_path': None,
            'vote_average': 6.5,
            'vote_count': 300,
            'popularity': 20.0,
            'adult': False,
            'original_language': 'en',
            'genre_ids': [],
        }
    ],
}


class DiscoverViewTests(APITestCase):
    @patch('entertainment.views.search_service.discover_media', return_value=DISCOVER_RESULT)
    def test_movie_type_returns_200(self, mock_svc):
        url = reverse('entertainment-discover')
        response = self.client.get(url, {'type': 'movie'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_type_returns_400(self):
        url = reverse('entertainment-discover')
        response = self.client.get(url, {'type': 'music'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

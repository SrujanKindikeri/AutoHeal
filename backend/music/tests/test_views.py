"""
Tests for the music app API views.
All MusicBrainz network calls are mocked.
"""

from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from music.services.musicbrainz_client import MusicBrainzError

MOCK_RECORDINGS = {
    'recordings': [
        {
            'id': 'aaaa-1111',
            'title': 'Test Track',
            'length': 210000,
            'artist-credit': [{'artist': {'id': 'bbbb-2222', 'name': 'Test Artist'}}],
            'releases': [],
            'tags': [],
        }
    ],
    'count': 1,
}

MOCK_ARTISTS = {
    'artists': [
        {
            'id': 'bbbb-2222',
            'name': 'Test Artist',
            'sort-name': 'Artist, Test',
            'tags': [],
            'disambiguation': '',
        }
    ],
    'count': 1,
}

MOCK_RELEASE_GROUPS = {
    'release-groups': [
        {
            'id': 'cccc-3333',
            'title': 'Test Album',
            'primary-type': 'Album',
            'artist-credit': [{'artist': {'id': 'bbbb-2222', 'name': 'Test Artist'}}],
            'first-release-date': '2024-01-01',
            'tags': [],
        }
    ],
    'count': 1,
}


class TestMusicTrendingView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.track_service.mb_client')
    def test_trending_returns_200(self, mock_client):
        mock_client.get.return_value = MOCK_RECORDINGS
        response = self.client.get('/api/v1/music/trending/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    @patch('music.services.track_service.mb_client')
    def test_trending_returns_502_on_provider_error(self, mock_client):
        mock_client.get.side_effect = MusicBrainzError('down', 503)
        response = self.client.get('/api/v1/music/trending/')
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)


class TestMusicPopularView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.artist_service.mb_client')
    def test_popular_returns_200(self, mock_client):
        mock_client.get.return_value = MOCK_ARTISTS
        response = self.client.get('/api/v1/music/popular/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)


class TestMusicNewReleasesView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.album_service.mb_client')
    def test_new_releases_returns_200(self, mock_client):
        mock_client.get.return_value = MOCK_RELEASE_GROUPS
        response = self.client.get('/api/v1/music/new-releases/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)


class TestMusicGenresView(APITestCase):
    def test_genres_returns_200(self):
        response = self.client.get('/api/v1/music/genres/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('genres', response.data)
        self.assertIsInstance(response.data['genres'], list)
        self.assertGreater(len(response.data['genres']), 0)
        self.assertIn('Rock', response.data['genres'])


class TestMusicSearchView(APITestCase):
    def setUp(self):
        cache.clear()

    def test_search_too_short_returns_400(self):
        response = self.client.get('/api/v1/music/search/?q=a')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('music.services.search_service.mb_client')
    def test_search_returns_200(self, mock_client):
        mock_client.get.return_value = MOCK_RECORDINGS
        response = self.client.get('/api/v1/music/search/?q=be&type=track')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('music.services.search_service.mb_client')
    def test_search_all_returns_categorized(self, mock_client):
        mock_client.get.side_effect = [MOCK_ARTISTS, MOCK_RELEASE_GROUPS, MOCK_RECORDINGS]
        response = self.client.get('/api/v1/music/search/?q=be&type=all')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('artists', response.data)
        self.assertIn('albums', response.data)
        self.assertIn('tracks', response.data)


class TestMusicTrackDetailView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.track_service.mb_client')
    def test_track_detail_handles_provider_error(self, mock_client):
        mock_client.get.side_effect = MusicBrainzError('not found', 404)
        response = self.client.get('/api/v1/music/tracks/fake-mbid/')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_502_BAD_GATEWAY])

    @patch('music.services.track_service.mb_client')
    def test_track_detail_returns_200(self, mock_client):
        track_data = dict(MOCK_RECORDINGS['recordings'][0])
        track_data['releases'] = []
        mock_client.get.return_value = track_data
        mock_client.get_cover_art.return_value = None
        response = self.client.get('/api/v1/music/tracks/aaaa-1111/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestMusicAlbumDetailView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.album_service.mb_client')
    def test_album_detail_handles_provider_error(self, mock_client):
        mock_client.get.side_effect = MusicBrainzError('not found', 404)
        response = self.client.get('/api/v1/music/albums/fake-mbid/')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_502_BAD_GATEWAY])


class TestMusicArtistDetailView(APITestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.artist_service.mb_client')
    def test_artist_detail_handles_provider_error(self, mock_client):
        mock_client.get.side_effect = MusicBrainzError('not found', 404)
        response = self.client.get('/api/v1/music/artists/fake-mbid/')
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_502_BAD_GATEWAY])

    @patch('music.services.artist_service.mb_client')
    def test_artist_detail_returns_200(self, mock_client):
        mock_client.get.return_value = MOCK_ARTISTS['artists'][0]
        response = self.client.get('/api/v1/music/artists/bbbb-2222/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

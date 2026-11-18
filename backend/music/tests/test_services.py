"""
Basic smoke tests for service layer functions.
All MusicBrainz network calls are mocked.
"""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from music.services import album_service, artist_service, search_service, track_service


class TestArtistService(TestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.artist_service.mb_client')
    def test_get_popular_artists_returns_data(self, mock_client):
        mock_client.get.return_value = {'artists': [], 'count': 0}
        result = artist_service.get_popular_artists()
        self.assertIn('artists', result)
        mock_client.get.assert_called_once()

    @patch('music.services.artist_service.mb_client')
    def test_get_artist_detail_caches_result(self, mock_client):
        mock_client.get.return_value = {'id': 'abc', 'name': 'Artist'}
        artist_service.get_artist_detail('abc')
        artist_service.get_artist_detail('abc')
        # Second call should use cache — mb_client.get called only once
        self.assertEqual(mock_client.get.call_count, 1)


class TestAlbumService(TestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.album_service.mb_client')
    def test_get_new_releases_returns_data(self, mock_client):
        mock_client.get.return_value = {'release-groups': [], 'count': 0}
        result = album_service.get_new_releases()
        self.assertIn('release-groups', result)


class TestTrackService(TestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.track_service.mb_client')
    def test_get_trending_tracks_returns_data(self, mock_client):
        mock_client.get.return_value = {'recordings': [], 'count': 0}
        result = track_service.get_trending_tracks()
        self.assertIn('recordings', result)


class TestSearchService(TestCase):
    def setUp(self):
        cache.clear()

    @patch('music.services.search_service.mb_client')
    def test_search_artists(self, mock_client):
        mock_client.get.return_value = {'artists': [], 'count': 0}
        result = search_service.search_artists('test')
        self.assertIn('artists', result)

    @patch('music.services.search_service.mb_client')
    def test_search_all(self, mock_client):
        mock_client.get.return_value = {'artists': [], 'release-groups': [], 'recordings': [], 'count': 0}
        result = search_service.search_all('test')
        self.assertIn('artists', result)
        self.assertIn('albums', result)
        self.assertIn('tracks', result)

    def test_get_music_genres_returns_list(self):
        genres = search_service.get_music_genres()
        self.assertIsInstance(genres, list)
        self.assertIn('Rock', genres)
        self.assertIn('Jazz', genres)

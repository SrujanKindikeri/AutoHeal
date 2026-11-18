"""
Tests for the MusicBrainzClient.
"""

import time
import unittest
from unittest.mock import MagicMock, patch

import requests

from music.services.musicbrainz_client import MusicBrainzClient, MusicBrainzError


def _make_client():
    return MusicBrainzClient()


class TestMusicBrainzClientGet(unittest.TestCase):

    def setUp(self):
        self.client = _make_client()
        # Speed up tests by mocking rate limiter
        self.client._rate_limit = lambda: None

    def _mock_response(self, status_code=200, json_data=None, headers=None):
        resp = MagicMock()
        resp.status_code = status_code
        resp.ok = (200 <= status_code < 300)
        resp.json.return_value = json_data or {}
        resp.headers = headers or {}
        return resp

    @patch('music.services.musicbrainz_client.requests.get')
    def test_successful_response(self, mock_get):
        mock_get.return_value = self._mock_response(200, {'recordings': []})
        result = self.client.get('/recording/')
        self.assertEqual(result, {'recordings': []})
        mock_get.assert_called_once()
        # fmt=json should be in params
        call_kwargs = mock_get.call_args
        self.assertIn('fmt', call_kwargs[1]['params'])
        self.assertEqual(call_kwargs[1]['params']['fmt'], 'json')

    @patch('music.services.musicbrainz_client.requests.get')
    def test_timeout_raises_error(self, mock_get):
        mock_get.side_effect = requests.Timeout()
        with self.assertRaises(MusicBrainzError) as ctx:
            self.client.get('/recording/')
        self.assertEqual(ctx.exception.status_code, 0)
        self.assertIn('timed out', ctx.exception.message)

    @patch('music.services.musicbrainz_client.requests.get')
    def test_connection_error_raises_error(self, mock_get):
        mock_get.side_effect = requests.ConnectionError('connection refused')
        with self.assertRaises(MusicBrainzError) as ctx:
            self.client.get('/recording/')
        self.assertEqual(ctx.exception.status_code, 0)
        self.assertIn('Connection error', ctx.exception.message)

    @patch('music.services.musicbrainz_client.time.sleep')
    @patch('music.services.musicbrainz_client.requests.get')
    def test_503_retries_then_raises(self, mock_get, mock_sleep):
        mock_get.return_value = self._mock_response(503)
        with self.assertRaises(MusicBrainzError) as ctx:
            self.client.get('/recording/')
        self.assertEqual(ctx.exception.status_code, 503)
        # Should have retried _MAX_503_RETRIES times plus initial
        self.assertEqual(mock_get.call_count, self.client._MAX_503_RETRIES + 1)

    @patch('music.services.musicbrainz_client.time.sleep')
    @patch('music.services.musicbrainz_client.requests.get')
    def test_503_succeeds_after_retry(self, mock_get, mock_sleep):
        good_resp = self._mock_response(200, {'recordings': [{'id': 'abc'}]})
        bad_resp = self._mock_response(503)
        mock_get.side_effect = [bad_resp, good_resp]
        result = self.client.get('/recording/')
        self.assertEqual(result['recordings'][0]['id'], 'abc')

    @patch('music.services.musicbrainz_client.time.sleep')
    @patch('music.services.musicbrainz_client.requests.get')
    def test_429_retries_with_retry_after(self, mock_get, mock_sleep):
        rate_resp = self._mock_response(429, headers={'Retry-After': '5'})
        good_resp = self._mock_response(200, {'artists': []})
        # First call returns 429, second (the retry) returns 200
        mock_get.side_effect = [rate_resp, good_resp]
        result = self.client.get('/artist/')
        self.assertEqual(result, {'artists': []})
        mock_sleep.assert_called_with(5)

    @patch('music.services.musicbrainz_client.requests.get')
    def test_non_200_raises_error(self, mock_get):
        mock_get.return_value = self._mock_response(500)
        with self.assertRaises(MusicBrainzError) as ctx:
            self.client.get('/recording/')
        self.assertEqual(ctx.exception.status_code, 500)

    def test_no_credentials_needed(self):
        """MusicBrainzClient requires no API key — just User-Agent."""
        client = MusicBrainzClient()
        headers = client._build_headers()
        self.assertIn('User-Agent', headers)
        self.assertNotIn('Authorization', headers)
        self.assertEqual(headers.get('Accept'), 'application/json')


class TestMusicBrainzClientCoverArt(unittest.TestCase):

    def setUp(self):
        self.client = _make_client()
        self.client._rate_limit = lambda: None

    @patch('music.services.musicbrainz_client.requests.get')
    def test_cover_art_returns_none_on_404(self, mock_get):
        resp = MagicMock()
        resp.status_code = 404
        resp.ok = False
        mock_get.return_value = resp
        result = self.client.get_cover_art('some-mbid')
        self.assertIsNone(result)

    @patch('music.services.musicbrainz_client.requests.get')
    def test_cover_art_returns_json_on_success(self, mock_get):
        resp = MagicMock()
        resp.status_code = 200
        resp.ok = True
        resp.json.return_value = {'images': [{'front': True, 'image': 'https://example.com/art.jpg'}]}
        mock_get.return_value = resp
        result = self.client.get_cover_art('some-mbid')
        self.assertIsNotNone(result)
        self.assertIn('images', result)

    @patch('music.services.musicbrainz_client.requests.get')
    def test_cover_art_returns_none_on_timeout(self, mock_get):
        mock_get.side_effect = requests.Timeout()
        result = self.client.get_cover_art('some-mbid')
        self.assertIsNone(result)

    @patch('music.services.musicbrainz_client.requests.get')
    def test_cover_art_returns_none_on_connection_error(self, mock_get):
        mock_get.side_effect = requests.ConnectionError()
        result = self.client.get_cover_art('some-mbid')
        self.assertIsNone(result)

"""
Tests for TMDBClient in entertainment.services.tmdb_client.
All HTTP calls are mocked — no live network requests.
"""

import unittest
from unittest.mock import MagicMock, patch, PropertyMock

import requests

from entertainment.services.tmdb_client import TMDBClient, TMDBError


def _make_response(status_code=200, json_body=None, headers=None):
    """Build a mock requests.Response-like object."""
    resp = MagicMock()
    resp.status_code = status_code
    resp.ok = (status_code < 400)
    resp.json.return_value = json_body or {}
    resp.headers = headers or {}
    return resp


class TestTMDBClientSuccessfulGet(unittest.TestCase):
    """GET returns the parsed JSON dict on 200."""

    @patch('entertainment.services.tmdb_client.requests.get')
    def test_returns_parsed_dict(self, mock_get):
        mock_get.return_value = _make_response(200, {'results': [{'id': 1}]})
        client = TMDBClient()
        result = client.get('/movie/popular')
        self.assertEqual(result, {'results': [{'id': 1}]})
        mock_get.assert_called_once()


class TestTMDBClient401(unittest.TestCase):
    """401 raises TMDBError with status_code=401."""

    @patch('entertainment.services.tmdb_client.requests.get')
    def test_raises_tmdb_error(self, mock_get):
        mock_get.return_value = _make_response(401)
        client = TMDBClient()
        with self.assertRaises(TMDBError) as cm:
            client.get('/movie/popular')
        self.assertEqual(cm.exception.status_code, 401)


class TestTMDBClient429Retry(unittest.TestCase):
    """First call → 429 with Retry-After: 0, second call → 200; client retries."""

    @patch('entertainment.services.tmdb_client.time.sleep')
    @patch('entertainment.services.tmdb_client.requests.get')
    def test_retries_and_returns_data(self, mock_get, mock_sleep):
        rate_limit_resp = _make_response(429, headers={'Retry-After': '0'})
        success_resp = _make_response(200, {'results': [{'id': 42}]})
        mock_get.side_effect = [rate_limit_resp, success_resp]

        client = TMDBClient()
        result = client.get('/movie/popular')

        self.assertEqual(result, {'results': [{'id': 42}]})
        self.assertEqual(mock_get.call_count, 2)
        mock_sleep.assert_called_once_with(0)


class TestTMDBClient429MaxRetries(unittest.TestCase):
    """Three consecutive 429s exhaust retries and raise TMDBError."""

    @patch('entertainment.services.tmdb_client.time.sleep')
    @patch('entertainment.services.tmdb_client.requests.get')
    def test_raises_after_max_retries(self, mock_get, mock_sleep):
        rate_limit_resp = _make_response(429, headers={'Retry-After': '0'})
        # _MAX_RETRIES=3, so we need 4 calls (attempt 0,1,2 retry; attempt 3 raises)
        mock_get.return_value = rate_limit_resp

        client = TMDBClient()
        with self.assertRaises(TMDBError) as cm:
            client.get('/movie/popular')
        self.assertEqual(cm.exception.status_code, 429)
        # 3 retries → sleep called 3 times
        self.assertEqual(mock_sleep.call_count, 3)


class TestTMDBClientTimeout(unittest.TestCase):
    """requests.Timeout raises TMDBError."""

    @patch('entertainment.services.tmdb_client.requests.get', side_effect=requests.Timeout)
    def test_raises_tmdb_error(self, mock_get):
        client = TMDBClient()
        with self.assertRaises(TMDBError) as cm:
            client.get('/movie/popular')
        self.assertEqual(cm.exception.status_code, 0)


class TestTMDBClientConnectionError(unittest.TestCase):
    """requests.ConnectionError raises TMDBError."""

    @patch(
        'entertainment.services.tmdb_client.requests.get',
        side_effect=requests.ConnectionError('refused'),
    )
    def test_raises_tmdb_error(self, mock_get):
        client = TMDBClient()
        with self.assertRaises(TMDBError) as cm:
            client.get('/movie/popular')
        self.assertEqual(cm.exception.status_code, 0)

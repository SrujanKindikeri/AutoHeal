"""
Tests for music app cache utilities.
"""

from unittest.mock import MagicMock

from django.core.cache import cache
from django.test import TestCase

from music.services.cache_utils import cache_key, get_cached_or_fetch


class TestCacheKey(TestCase):
    def test_generates_prefixed_key(self):
        key = cache_key('tracks', 'trending', 1)
        self.assertEqual(key, 'music:tracks:trending:1')

    def test_single_part(self):
        key = cache_key('genres')
        self.assertEqual(key, 'music:genres')

    def test_multiple_parts(self):
        key = cache_key('artist', 'detail', 'some-mbid')
        self.assertEqual(key, 'music:artist:detail:some-mbid')


class TestGetCachedOrFetch(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_calls_fetch_fn_on_cache_miss(self):
        fetch_fn = MagicMock(return_value={'data': 'fresh'})
        result = get_cached_or_fetch('music:test:miss', fetch_fn, ttl=60)
        fetch_fn.assert_called_once()
        self.assertEqual(result, {'data': 'fresh'})

    def test_returns_cached_value_without_calling_fetch(self):
        cache.set('music:test:hit', {'data': 'cached'}, 60)
        fetch_fn = MagicMock()
        result = get_cached_or_fetch('music:test:hit', fetch_fn, ttl=60)
        fetch_fn.assert_not_called()
        self.assertEqual(result, {'data': 'cached'})

    def test_stores_result_in_cache(self):
        fetch_fn = MagicMock(return_value={'data': 'stored'})
        get_cached_or_fetch('music:test:store', fetch_fn, ttl=60)
        cached = cache.get('music:test:store')
        self.assertEqual(cached, {'data': 'stored'})

    def test_second_call_uses_cache(self):
        fetch_fn = MagicMock(return_value={'data': 'value'})
        get_cached_or_fetch('music:test:second', fetch_fn, ttl=60)
        get_cached_or_fetch('music:test:second', fetch_fn, ttl=60)
        # fetch_fn should only have been called once
        self.assertEqual(fetch_fn.call_count, 1)

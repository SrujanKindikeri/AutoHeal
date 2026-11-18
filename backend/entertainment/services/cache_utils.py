"""
Cache utilities for TMDB responses.

All keys are prefixed with 'tmdb:'. Call get_cached_or_fetch() to read from
the cache on a hit or populate it on a miss.
"""

from typing import Any, Callable

from django.core.cache import cache

# TTL constants (seconds)
TRENDING_TTL = 300    # 5 minutes
POPULAR_TTL = 300     # 5 minutes
DETAIL_TTL = 3600     # 1 hour
SEARCH_TTL = 120      # 2 minutes
GENRE_TTL = 86400     # 1 day

_PREFIX = "tmdb:"


def cache_key(*parts) -> str:
    """Build a cache key by joining *parts* with ':' and prepending 'tmdb:'."""
    return _PREFIX + ":".join(str(p) for p in parts)


def get_cached_or_fetch(key: str, fetch_fn: Callable[[], Any], ttl: int) -> Any:
    """
    Return the cached value for *key*. When the key is absent, call *fetch_fn*,
    store the result under *key* with the given *ttl*, and return it.
    """
    cached = cache.get(key)
    if cached is not None:
        return cached
    result = fetch_fn()
    cache.set(key, result, ttl)
    return result

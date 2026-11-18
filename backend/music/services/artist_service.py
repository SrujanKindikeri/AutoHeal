"""
Artist discovery service.

Wraps MusicBrainz artist endpoints with Redis caching.
"""

from .cache_utils import DETAIL_TTL, POPULAR_TTL, cache_key, get_cached_or_fetch
from .musicbrainz_client import mb_client


def get_popular_artists(page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("artists", "popular", page, page_size)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/artist/',
            params={
                'query': 'artist:*',
                'limit': page_size,
                'offset': (page - 1) * page_size,
            },
        ),
        POPULAR_TTL,
    )


def get_artist_detail(mbid: str) -> dict:
    key = cache_key("artist", "detail", mbid)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            f'/artist/{mbid}',
            params={'inc': 'url-rels+tags+ratings'},
        ),
        DETAIL_TTL,
    )


def get_artist_top_tracks(mbid: str, page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("artist", "tracks", mbid, page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/recording/',
            params={
                'artist': mbid,
                'limit': page_size,
                'offset': (page - 1) * page_size,
                'inc': 'artist-credits+releases',
            },
        ),
        POPULAR_TTL,
    )


def get_artist_albums(mbid: str, page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("artist", "albums", mbid, page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/release-group/',
            params={
                'artist': mbid,
                'type': 'album',
                'limit': page_size,
                'offset': (page - 1) * page_size,
                'inc': 'artist-credits',
            },
        ),
        POPULAR_TTL,
    )

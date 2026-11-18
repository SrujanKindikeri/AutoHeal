"""
Album discovery service.

Wraps MusicBrainz release-group endpoints with Redis caching.
Enriches album detail with cover art from Cover Art Archive.
"""

import logging

from .cache_utils import DETAIL_TTL, NEW_RELEASES_TTL, cache_key, get_cached_or_fetch
from .musicbrainz_client import mb_client

logger = logging.getLogger(__name__)


def get_new_releases(page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("albums", "new_releases", page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/release-group/',
            params={
                'query': 'primarytype:album',
                'limit': page_size,
                'offset': (page - 1) * page_size,
            },
        ),
        NEW_RELEASES_TTL,
    )


def _fetch_album_detail(mbid: str) -> dict:
    data = mb_client.get(
        f'/release-group/{mbid}',
        params={'inc': 'artist-credits+releases+tags'},
    )
    # Enrich with cover art
    cover_art = mb_client.get_cover_art(mbid)
    if cover_art:
        images = cover_art.get('images', [])
        for img in images:
            if img.get('front'):
                data['cover_art_url'] = img.get('image', '')
                break
        if 'cover_art_url' not in data and images:
            data['cover_art_url'] = images[0].get('image', '')
    if 'cover_art_url' not in data:
        data['cover_art_url'] = ''
    return data


def get_album_detail(mbid: str) -> dict:
    key = cache_key("album", "detail", mbid)
    return get_cached_or_fetch(key, lambda: _fetch_album_detail(mbid), DETAIL_TTL)


def _fetch_album_tracks(mbid: str) -> dict:
    # Find the canonical release for this release-group
    release_data = mb_client.get(
        '/release/',
        params={
            'release-group': mbid,
            'inc': 'recordings+artist-credits',
            'limit': 1,
        },
    )
    releases = release_data.get('releases', [])
    if not releases:
        return {'tracks': [], 'release_mbid': None}

    release_mbid = releases[0].get('id', '')
    if not release_mbid:
        return {'tracks': [], 'release_mbid': None}

    detail = mb_client.get(
        f'/release/{release_mbid}',
        params={'inc': 'recordings+artist-credits'},
    )
    return detail


def get_album_tracks(mbid: str) -> dict:
    key = cache_key("album", "tracks", mbid)
    return get_cached_or_fetch(key, lambda: _fetch_album_tracks(mbid), DETAIL_TTL)

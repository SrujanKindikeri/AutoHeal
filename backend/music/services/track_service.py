"""
Track discovery service.

Wraps MusicBrainz recording endpoints with Redis caching.
Enriches track detail with cover art for the first associated release.
"""

import logging

from .cache_utils import DETAIL_TTL, TRENDING_TTL, cache_key, get_cached_or_fetch
from .musicbrainz_client import mb_client

logger = logging.getLogger(__name__)


def get_trending_tracks(page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("tracks", "trending", page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/recording/',
            params={
                'query': 'recording:*',
                'limit': page_size,
                'offset': (page - 1) * page_size,
                'inc': 'artist-credits+releases',
            },
        ),
        TRENDING_TTL,
    )


def _fetch_track_detail(mbid: str) -> dict:
    data = mb_client.get(
        f'/recording/{mbid}',
        params={'inc': 'artist-credits+releases+tags+ratings'},
    )
    # Try to enrich with cover art from the first associated release
    releases = data.get('releases', [])
    data['cover_art_url'] = ''
    for release in releases:
        release_mbid = release.get('id', '')
        if release_mbid:
            cover_art = mb_client.get_cover_art(release_mbid)
            if cover_art:
                images = cover_art.get('images', [])
                for img in images:
                    if img.get('front'):
                        data['cover_art_url'] = img.get('image', '')
                        break
                if not data['cover_art_url'] and images:
                    data['cover_art_url'] = images[0].get('image', '')
            if data['cover_art_url']:
                break
    return data


def get_track_detail(mbid: str) -> dict:
    key = cache_key("track", "detail", mbid)
    return get_cached_or_fetch(key, lambda: _fetch_track_detail(mbid), DETAIL_TTL)

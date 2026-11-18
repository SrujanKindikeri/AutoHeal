"""
Music search service.

Wraps MusicBrainz search endpoints with Redis caching.
Also provides a curated static genre list.
"""

from .cache_utils import GENRE_TTL, SEARCH_TTL, cache_key, get_cached_or_fetch
from .musicbrainz_client import mb_client

MUSIC_GENRES = [
    'Rock', 'Pop', 'Jazz', 'Classical', 'Electronic', 'Hip-Hop',
    'R&B', 'Country', 'Metal', 'Folk', 'Blues', 'Reggae', 'Soul',
    'Funk', 'Punk', 'Alternative', 'Indie', 'Latin', 'World', 'Ambient',
]


def search_artists(query: str, page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("search", "artist", query, page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/artist/',
            params={
                'query': query,
                'limit': page_size,
                'offset': (page - 1) * page_size,
            },
        ),
        SEARCH_TTL,
    )


def search_albums(query: str, page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("search", "album", query, page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/release-group/',
            params={
                'query': query,
                'type': 'album',
                'limit': page_size,
                'offset': (page - 1) * page_size,
            },
        ),
        SEARCH_TTL,
    )


def search_tracks(query: str, page: int = 1, page_size: int = 20) -> dict:
    key = cache_key("search", "track", query, page)
    return get_cached_or_fetch(
        key,
        lambda: mb_client.get(
            '/recording/',
            params={
                'query': query,
                'limit': page_size,
                'offset': (page - 1) * page_size,
                'inc': 'artist-credits+releases',
            },
        ),
        SEARCH_TTL,
    )


def search_all(query: str, page: int = 1, page_size: int = 10) -> dict:
    key = cache_key("search", "all", query, page)

    def _fetch():
        artists = search_artists(query, page=page, page_size=page_size)
        albums = search_albums(query, page=page, page_size=page_size)
        tracks = search_tracks(query, page=page, page_size=page_size)
        return {
            'artists': artists.get('artists', []),
            'albums': albums.get('release-groups', []),
            'tracks': tracks.get('recordings', []),
        }

    return get_cached_or_fetch(key, _fetch, SEARCH_TTL)


def get_music_genres() -> list:
    key = cache_key("genres")
    return get_cached_or_fetch(key, lambda: MUSIC_GENRES, GENRE_TTL)

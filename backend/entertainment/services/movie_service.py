"""
Movie discovery service.

Thin wrappers around the TMDB client that add caching and strip adult content.
All public functions return the raw TMDB response dict (or list) with adult
items removed from any 'results' list.
"""

from .cache_utils import DETAIL_TTL, POPULAR_TTL, TRENDING_TTL, cache_key, get_cached_or_fetch
from .tmdb_client import tmdb_client


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _filter_adult(data: dict) -> dict:
    """Remove entries where adult=True from the 'results' list in *data*."""
    if "results" in data and isinstance(data["results"], list):
        data = dict(data)
        data["results"] = [item for item in data["results"] if not item.get("adult", False)]
    return data


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_trending_movies(time_window: str = "day", page: int = 1) -> dict:
    key = cache_key("trending", "movie", time_window, page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get(f"/trending/movie/{time_window}", params={"page": page})
        ),
        TRENDING_TTL,
    )


def get_popular_movies(page: int = 1) -> dict:
    key = cache_key("popular", "movie", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/movie/popular", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_top_rated_movies(page: int = 1) -> dict:
    key = cache_key("top_rated", "movie", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/movie/top_rated", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_now_playing_movies(page: int = 1) -> dict:
    key = cache_key("now_playing", "movie", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/movie/now_playing", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_upcoming_movies(page: int = 1) -> dict:
    key = cache_key("upcoming", "movie", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/movie/upcoming", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_movie_detail(tmdb_id: int) -> dict:
    key = cache_key("detail", "movie", tmdb_id)
    return get_cached_or_fetch(
        key,
        lambda: tmdb_client.get(
            f"/movie/{tmdb_id}",
            params={"append_to_response": "recommendations,credits"},
        ),
        DETAIL_TTL,
    )

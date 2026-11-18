"""
TV-show discovery service.

Same pattern as movie_service: thin wrappers around the TMDB client with
caching and adult-content filtering.
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

def get_trending_tv(time_window: str = "day", page: int = 1) -> dict:
    key = cache_key("trending", "tv", time_window, page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get(f"/trending/tv/{time_window}", params={"page": page})
        ),
        TRENDING_TTL,
    )


def get_popular_tv(page: int = 1) -> dict:
    key = cache_key("popular", "tv", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/tv/popular", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_top_rated_tv(page: int = 1) -> dict:
    key = cache_key("top_rated", "tv", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/tv/top_rated", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_on_the_air_tv(page: int = 1) -> dict:
    key = cache_key("on_the_air", "tv", page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/tv/on_the_air", params={"page": page})
        ),
        POPULAR_TTL,
    )


def get_tv_detail(tmdb_id: int) -> dict:
    key = cache_key("detail", "tv", tmdb_id)
    return get_cached_or_fetch(
        key,
        lambda: tmdb_client.get(
            f"/tv/{tmdb_id}",
            params={"append_to_response": "recommendations,credits"},
        ),
        DETAIL_TTL,
    )

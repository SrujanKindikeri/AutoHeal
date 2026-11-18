"""
Search and discovery service.

Provides movie/TV search, multi-search, genre lookup, and discover endpoint.
All results are cached; adult content is filtered by default.
"""

from .cache_utils import GENRE_TTL, POPULAR_TTL, SEARCH_TTL, cache_key, get_cached_or_fetch
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


def _validate_query(query: str) -> None:
    if not query or len(query.strip()) < 2:
        raise ValueError("Search query must be at least 2 characters.")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def search_movies(query: str, page: int = 1) -> dict:
    _validate_query(query)
    key = cache_key("search", "movie", query, page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/search/movie", params={"query": query, "page": page})
        ),
        SEARCH_TTL,
    )


def search_tv(query: str, page: int = 1) -> dict:
    _validate_query(query)
    key = cache_key("search", "tv", query, page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(
            tmdb_client.get("/search/tv", params={"query": query, "page": page})
        ),
        SEARCH_TTL,
    )


def search_multi(query: str, page: int = 1) -> dict:
    """
    Multi-search across movies, TV shows, and people. Person results are
    removed before returning so the caller only sees movies and shows.
    """
    _validate_query(query)
    key = cache_key("search", "multi", query, page)

    def _fetch():
        data = tmdb_client.get("/search/multi", params={"query": query, "page": page})
        if "results" in data and isinstance(data["results"], list):
            data = dict(data)
            data["results"] = [
                item
                for item in data["results"]
                if item.get("media_type") != "person" and not item.get("adult", False)
            ]
        return data

    return get_cached_or_fetch(key, _fetch, SEARCH_TTL)


def get_genres(media_type: str) -> dict:
    """
    Return the TMDB genre list for *media_type* ('movie' or 'tv').
    Raises ValueError for any other value.
    """
    if media_type not in ("movie", "tv"):
        raise ValueError("media_type must be 'movie' or 'tv'.")
    key = cache_key("genres", media_type)
    return get_cached_or_fetch(
        key,
        lambda: tmdb_client.get(f"/genre/{media_type}/list"),
        GENRE_TTL,
    )


def discover_media(
    media_type: str = "movie",
    genre_id: int | None = None,
    sort_by: str = "popularity.desc",
    page: int = 1,
) -> dict:
    """
    Discover movies or TV shows via the TMDB /discover endpoint.
    Adult content is always excluded (include_adult=false).
    """
    if media_type not in ("movie", "tv"):
        raise ValueError("media_type must be 'movie' or 'tv'.")

    params: dict = {
        "sort_by": sort_by,
        "page": page,
        "include_adult": "false",
    }
    if genre_id is not None:
        params["with_genres"] = genre_id

    key = cache_key("discover", media_type, genre_id or "all", sort_by, page)
    return get_cached_or_fetch(
        key,
        lambda: _filter_adult(tmdb_client.get(f"/discover/{media_type}", params=params)),
        POPULAR_TTL,
    )

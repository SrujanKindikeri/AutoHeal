"""
TMDB HTTP client.

Authenticates with Bearer token when TMDB_READ_ACCESS_TOKEN is set,
falling back to api_key query parameter. Handles rate-limiting (HTTP 429)
with up to 3 retries and raises TMDBError for all other HTTP and network
failures. The API key/token is never written to logs.
"""

import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class TMDBError(Exception):
    """Raised for TMDB API failures."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class TMDBClient:
    _MAX_RETRIES = 3
    _DEFAULT_TIMEOUT = 10
    _DEFAULT_RETRY_WAIT = 1

    def __init__(self):
        self._api_key: str = getattr(settings, "TMDB_API_KEY", "")
        self._token: str = getattr(settings, "TMDB_READ_ACCESS_TOKEN", "")
        self._base_url: str = getattr(
            settings, "TMDB_BASE_URL", "https://api.themoviedb.org/3"
        ).rstrip("/")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_headers(self) -> dict:
        headers = {"Accept": "application/json"}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        return headers

    def _build_params(self, extra: dict | None) -> dict:
        params: dict = {}
        if not self._token and self._api_key:
            params["api_key"] = self._api_key
        if extra:
            params.update(extra)
        return params

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get(self, endpoint: str, params: dict | None = None) -> dict:
        """
        Perform a GET request to *endpoint* (relative path, e.g. '/movie/popular')
        and return the parsed JSON response.

        Retries up to _MAX_RETRIES times on HTTP 429, respecting Retry-After.
        Raises TMDBError on any other HTTP error or network failure.
        """
        url = f"{self._base_url}/{endpoint.lstrip('/')}"
        headers = self._build_headers()
        request_params = self._build_params(params)

        for attempt in range(self._MAX_RETRIES + 1):
            try:
                response = requests.get(
                    url,
                    headers=headers,
                    params=request_params,
                    timeout=self._DEFAULT_TIMEOUT,
                )
            except requests.Timeout:
                raise TMDBError(
                    f"Request to TMDB timed out after {self._DEFAULT_TIMEOUT}s",
                    status_code=0,
                )
            except requests.ConnectionError as exc:
                raise TMDBError(
                    f"Connection error reaching TMDB: {exc}",
                    status_code=0,
                )

            if response.status_code == 429:
                if attempt < self._MAX_RETRIES:
                    wait = int(response.headers.get("Retry-After", self._DEFAULT_RETRY_WAIT))
                    logger.warning(
                        "TMDB rate limit hit; retrying in %d s (attempt %d/%d)",
                        wait,
                        attempt + 1,
                        self._MAX_RETRIES,
                    )
                    time.sleep(wait)
                    continue
                raise TMDBError("TMDB rate limit exceeded after retries", status_code=429)

            if not response.ok:
                raise TMDBError(
                    f"TMDB returned HTTP {response.status_code}",
                    status_code=response.status_code,
                )

            return response.json()

        # Unreachable, but satisfies type checkers.
        raise TMDBError("TMDB request failed", status_code=0)  # pragma: no cover


# Module-level singleton.
tmdb_client = TMDBClient()

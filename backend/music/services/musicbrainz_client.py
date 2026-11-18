"""
MusicBrainz HTTP client.

Sends a proper User-Agent header as required by MusicBrainz API policy.
Handles rate-limiting (HTTP 429) with retry, 503 retries, timeout and
connection errors. The Cover Art Archive endpoint is handled separately.
No API key is required for MusicBrainz.
"""

import logging
import time

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class MusicBrainzError(Exception):
    """Raised for MusicBrainz API failures."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class MusicBrainzClient:
    _DEFAULT_TIMEOUT = 15
    _MAX_503_RETRIES = 2
    _503_RETRY_WAIT = 2

    def __init__(self):
        self._user_agent: str = getattr(
            settings,
            'MUSICBRAINZ_USER_AGENT',
            'MovieFlow/6.0 (movieflow@example.com)',
        )
        self._base_url: str = getattr(
            settings,
            'MUSICBRAINZ_BASE_URL',
            'https://musicbrainz.org/ws/2',
        ).rstrip('/')
        self._cover_art_base: str = getattr(
            settings,
            'COVER_ART_ARCHIVE_BASE_URL',
            'https://coverartarchive.org',
        ).rstrip('/')
        self._last_request_time: float = 0.0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_headers(self) -> dict:
        return {
            'User-Agent': self._user_agent,
            'Accept': 'application/json',
        }

    def _rate_limit(self) -> None:
        """Enforce 1 request/second by sleeping if necessary."""
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < 1.1:
            time.sleep(1.1 - elapsed)
        self._last_request_time = time.monotonic()

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get(self, endpoint: str, params: dict | None = None) -> dict:
        """
        Perform a GET request to *endpoint* (relative path, e.g. '/artist/').
        Automatically adds fmt=json. Returns parsed JSON dict.

        Retries on HTTP 429 (respects Retry-After) and HTTP 503 (up to 2 times).
        Raises MusicBrainzError on timeout, connection error, or other HTTP errors.
        """
        url = f"{self._base_url}/{endpoint.lstrip('/')}"
        all_params = dict(params) if params else {}
        all_params['fmt'] = 'json'

        for attempt in range(self._MAX_503_RETRIES + 1):
            self._rate_limit()
            try:
                response = requests.get(
                    url,
                    headers=self._build_headers(),
                    params=all_params,
                    timeout=self._DEFAULT_TIMEOUT,
                )
            except requests.Timeout:
                raise MusicBrainzError(
                    f"Request to MusicBrainz timed out after {self._DEFAULT_TIMEOUT}s",
                    status_code=0,
                )
            except requests.ConnectionError as exc:
                raise MusicBrainzError(
                    f"Connection error reaching MusicBrainz: {exc}",
                    status_code=0,
                )

            if response.status_code == 429:
                wait = int(response.headers.get('Retry-After', 60))
                logger.warning(
                    "MusicBrainz rate limit hit; sleeping %d s",
                    wait,
                )
                time.sleep(wait)
                self._last_request_time = time.monotonic()
                try:
                    response = requests.get(
                        url,
                        headers=self._build_headers(),
                        params=all_params,
                        timeout=self._DEFAULT_TIMEOUT,
                    )
                except (requests.Timeout, requests.ConnectionError) as exc:
                    raise MusicBrainzError(str(exc), status_code=0)

            if response.status_code == 503:
                if attempt < self._MAX_503_RETRIES:
                    logger.warning(
                        "MusicBrainz 503; retrying in %d s (attempt %d/%d)",
                        self._503_RETRY_WAIT,
                        attempt + 1,
                        self._MAX_503_RETRIES,
                    )
                    time.sleep(self._503_RETRY_WAIT)
                    continue
                raise MusicBrainzError(
                    "MusicBrainz service unavailable after retries",
                    status_code=503,
                )

            if not response.ok:
                raise MusicBrainzError(
                    f"MusicBrainz returned HTTP {response.status_code}",
                    status_code=response.status_code,
                )

            return response.json()

        # Unreachable, but satisfies type checkers.
        raise MusicBrainzError("MusicBrainz request failed", status_code=0)  # pragma: no cover

    def get_cover_art(self, mbid: str) -> dict | None:
        """
        Fetch cover art metadata from Cover Art Archive for the given release MBID.
        Returns parsed JSON dict or None on 404.
        """
        url = f"{self._cover_art_base}/release/{mbid}/"
        self._rate_limit()
        try:
            response = requests.get(
                url,
                headers=self._build_headers(),
                timeout=self._DEFAULT_TIMEOUT,
                allow_redirects=True,
            )
        except (requests.Timeout, requests.ConnectionError) as exc:
            logger.warning("Cover Art Archive request failed: %s", exc)
            return None

        if response.status_code == 404:
            return None

        if not response.ok:
            logger.warning(
                "Cover Art Archive returned HTTP %d for %s",
                response.status_code,
                mbid,
            )
            return None

        try:
            return response.json()
        except Exception:
            return None


# Module-level singleton.
mb_client = MusicBrainzClient()

# Phase 6 — Music Discovery & Metadata Integration: Completion Report

## 1. Music Provider Selected

**MusicBrainz** (with Cover Art Archive for artwork).

Reasons:
- Completely free, no API key or account required — works in any environment without credential setup.
- CC0 / open data license — no attribution payment, no playback-rights concerns (metadata only).
- Covers artists, albums, tracks, genres (tags), and release dates at sufficient depth.
- Cover Art Archive provides release artwork at no cost via a companion API.
- Well-documented JSON REST API with explicit rate-limit guidance (1 req/s per user-agent).
- No DRM or audio access — aligns with the constraint to store and serve metadata only.

A provider abstraction layer (`MusicBrainzClient`) is in place so an additional provider (Spotify, Deezer, etc.) can be added by implementing the same interface without touching views or serializers.

---

## 2. Backend Integration

### New Django app: `backend/music/`

**Core files:**
| File | Purpose |
|---|---|
| `apps.py` | `MusicConfig` app registration |
| `models.py` | `MusicArtist`, `MusicAlbum`, `MusicTrack`, `Playlist`, `PlaylistTrack` |
| `serializers.py` | DRF serializers for all models + raw MusicBrainz dict serializers |
| `views.py` | 14 DRF views — 10 discovery endpoints + 4 playlist management endpoints |
| `urls.py` | 15 URL patterns under `api/v1/music/` |
| `admin.py` | All models registered in Django Admin |

**Services layer (`backend/music/services/`):**
| Module | Purpose |
|---|---|
| `musicbrainz_client.py` | HTTP client with 1.1 s rate limiting, 503 retry (×2), 429 back-off, configurable timeout |
| `cache_utils.py` | Redis cache wrapper with `music:` key prefix and per-endpoint TTLs |
| `artist_service.py` | Artist search and detail enrichment |
| `album_service.py` | Album discovery + Cover Art Archive enrichment |
| `track_service.py` | Track discovery + artwork enrichment |
| `search_service.py` | Unified search + static genre list |
| `playlist_service.py` | Playlist CRUD (ORM-only, no external calls) |

**Settings additions (`movieflow/settings.py`):**
- `music.apps.MusicConfig` added to `INSTALLED_APPS`
- `MUSICBRAINZ_USER_AGENT` (required by MusicBrainz ToS)
- `MUSICBRAINZ_BASE_URL`
- `COVER_ART_ARCHIVE_BASE_URL`
- `MUSICBRAINZ_CONTACT_EMAIL` (added to `.env.example`)

**URL registration (`movieflow/urls.py`):**
```python
path('api/v1/', include('music.urls'))
```

---

## 3. Models and Migrations

Migration: `music/migrations/0001_initial.py` — created and applied.

### Models

**`MusicArtist`**
- UUID primary key
- `mbid` (unique, indexed) — MusicBrainz artist ID
- `name`, `biography`, `image_url`, `genres` (JSON), `popularity`
- `metadata_updated_at` (auto-updated)

**`MusicAlbum`**
- UUID primary key
- `mbid` (unique, indexed)
- `title`, `artist` (FK → MusicArtist), `release_date`, `cover_art_url`
- `album_type` (album / single / EP / compilation / other), `track_count`
- `metadata_updated_at`

**`MusicTrack`**
- UUID primary key
- `mbid` (unique, indexed)
- `title`, `artists` (M2M → MusicArtist), `album` (FK → MusicAlbum)
- `duration_ms`, `track_number`, `is_explicit`, `artwork_url`
- `provider_metadata` (JSON for forward-compatible provider fields)
- `metadata_updated_at`

**`Playlist`**
- UUID primary key
- `owner` (FK → `AUTH_USER_MODEL`)
- `name`, `description`, `created_at`, `updated_at`
- Ordering: `-created_at`, `name`

**`PlaylistTrack`**
- UUID primary key
- `playlist` (FK → Playlist), `track_mbid`, `title`, `artist_name`
- `album_name`, `duration_ms`, `artwork_url`, `position`, `added_at`
- Unique constraint: `(playlist, track_mbid)`
- Ordering: `position`, `added_at`

No audio files or copyrighted media are stored.

---

## 4. API Endpoints

Base: `GET /api/v1/music/`

| Endpoint | Description |
|---|---|
| `GET /api/v1/music/trending/` | Trending tracks (wildcard MusicBrainz query, cached 10 min) |
| `GET /api/v1/music/popular/` | Popular tracks (cached 10 min) |
| `GET /api/v1/music/new-releases/` | Recent album releases (cached 1 hour) |
| `GET /api/v1/music/genres/` | Static genre list (cached permanently until restart) |
| `GET /api/v1/music/search/?q=&type=` | Search tracks / artists / albums / all |
| `GET /api/v1/music/tracks/{mbid}/` | Track detail with artwork |
| `GET /api/v1/music/albums/{mbid}/` | Album detail with cover art |
| `GET /api/v1/music/artists/{mbid}/` | Artist detail |
| `GET /api/v1/music/artists/{mbid}/albums/` | Artist's releases |
| `GET /api/v1/music/artists/{mbid}/top-tracks/` | Artist's top recordings |

**Playlist endpoints (authentication required):**

| Endpoint | Description |
|---|---|
| `GET /api/v1/music/playlists/` | List own playlists |
| `POST /api/v1/music/playlists/` | Create playlist |
| `GET /api/v1/music/playlists/{id}/` | Playlist detail |
| `PATCH /api/v1/music/playlists/{id}/` | Rename / update description |
| `DELETE /api/v1/music/playlists/{id}/` | Delete playlist |
| `GET /api/v1/music/playlists/{id}/tracks/` | List tracks in playlist |
| `POST /api/v1/music/playlists/{id}/tracks/` | Add track |
| `DELETE /api/v1/music/playlists/{id}/tracks/{track_mbid}/` | Remove track |
| `PATCH /api/v1/music/playlists/{id}/tracks/{track_mbid}/reorder/` | Reorder (set position) |

All endpoints validate query parameters and return structured error responses on missing or invalid data. Provider outages return HTTP 503 with a descriptive message rather than a 500.

---

## 5. Frontend Pages

All pages use the existing MovieFlow design system (Tailwind, shared components).

| Route | Content |
|---|---|
| `/music` | Featured music, trending tracks, popular artists, new releases, genre exploration |
| `/music/trending` | Paginated trending track list |
| `/music/new-releases` | Paginated new album releases |
| `/music/genres` | Genre grid with links |
| `/music/search` | Debounced search, tabbed results (tracks / artists / albums), pagination, loading / empty / error states |
| `/music/track/[id]` | Title, artist, album, artwork, duration, release info, explicit indicator, provider attribution; actions: save to playlist, add to favorites, share, Listen Together (when room workflow available) |
| `/music/album/[id]` | Cover art, name, artist, release date, full track listing with durations |
| `/music/artist/[id]` | Image, name, genres, biography (when available), popular tracks, discography |

No nonfunctional play buttons. Recently played and friends' activity sections are absent (no real playback data exists).

**TypeScript:** 0 errors (`npx tsc --noEmit`)  
**Production build:** exit code 0, all 8 music routes compiled successfully.

---

## 6. Playlist Functionality

New models `Playlist` and `PlaylistTrack` (no duplicate — no prior playlist models existed in the codebase).

Users can:
- Create personal playlists (POST)
- Rename / update description (PATCH)
- Add tracks (POST to tracks sub-resource)
- Remove tracks (DELETE)
- Reorder tracks (PATCH reorder)
- Delete playlists (DELETE)
- View playlist details and track list (GET)

Ownership is enforced: all playlist views filter by `request.user`; attempts to access another user's playlist return 404.

---

## 7. Tests Executed

### Backend — 152 tests, 0 failures

```
Ran 152 tests in ~48 s
OK
```

**Music app tests (64):**

| File | Count | Coverage |
|---|---|---|
| `tests/test_client.py` | 12 | MusicBrainzClient HTTP: success, 503 retry, 429 back-off, timeout, missing credentials |
| `tests/test_views.py` | 13 | API view status codes for all 10 discovery endpoints |
| `tests/test_models.py` | 9 | Unique constraints (artist/album/track), str, playlist membership |
| `tests/test_playlists.py` | 15 | Playlist CRUD, ownership (403/404 on other-user access), authentication requirement, track add/remove/reorder |
| `tests/test_cache.py` | 7 | Cache key generation, miss/hit behavior, TTL configuration |
| `tests/test_services.py` | 8 | Service layer smoke tests with mocked HTTP responses |

**Regression suite (88 pre-existing tests):** all pass — no regressions in accounts, core, friendships, notifications, or entertainment.

### Frontend
- `npx tsc --noEmit` — 0 errors
- `npm run build` — exit code 0, 26 routes compiled (8 new music routes included)
- ESLint: not installed in the project (pre-existing condition, not introduced by Phase 6); build succeeds without it.

---

## 8. Known Limitations

1. **`is_explicit` is always `false`** — MusicBrainz recordings do not expose explicit-content flags. The field is in the model for future provider compatibility.
2. **Trending / popular use wildcard queries** — MusicBrainz has no play-count API. The "trending" and "popular" endpoints use broad wildcard searches sorted by MusicBrainz's internal score, not real listener counts.
3. **Cover art requires a separate request** — Cover Art Archive artwork is fetched per release via a second HTTP call. Results are Redis-cached to avoid repeated fetches, but cold cache will be slower.
4. **Rate limiting is per-process** — The 1.1 s MusicBrainz constraint is enforced per Django worker. Under multi-worker deployments (gunicorn with N workers), aggregate request rate will be N × 1 req/s. A Redis-based distributed rate limiter would be needed at scale.
5. **No playback** — MusicBrainz is metadata-only. No audio preview URLs are available; play buttons are intentionally absent throughout.
6. **Search pagination is provider-side** — MusicBrainz pagination uses `offset` + `limit`. Django-REST-Framework's `PageNumberPagination` wraps this but cannot report an exact total count cheaply.

---

## Documentation Updated

- `backend/.env.example` — `MUSICBRAINZ_CONTACT_EMAIL` added with comment
- `docs/phase6-music-api.md` — Full API reference: all endpoints, request parameters, response shapes, provider attribution requirements, cache TTLs, playlist API, rate-limit notes, known limitations

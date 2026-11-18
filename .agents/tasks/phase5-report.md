# Phase 5 Completion Report — Movie & TV Discovery

**Date:** 2025  
**Workflow:** `wf_a6f677fe959b86a6`

---

## 1. Audit Findings (Pre-Phase-5 State)

The audit step produced no findings (the audit output block was empty), which indicates Phase 5 was being added to a clean base. The workspace contained:

- **Existing backend apps:** `accounts`, `friendships`, `notifications`, `core` — all from Phases 1–4.
- **No prior entertainment/TMDB code** — no `entertainment` or `watchlist` Django app existed before Phase 5.
- **No prior Movie or TVShow Django models** — the original architecture notes planned for these but they had not been created.
- **Frontend:** 11 pages and a full Phase 4 design system; no `/movies`, `/shows`, or `/search` routes existed.
- **Environment files:** `backend/.env.example` contained empty `TMDB_API_KEY=` and `TMDB_READ_ACCESS_TOKEN=` placeholders without Phase 5 documentation context.

---

## 2. TMDB Integration Details

### Client (`backend/entertainment/tmdb_client.py`)

- Reads `TMDB_API_KEY` and `TMDB_READ_ACCESS_TOKEN` from environment variables via `django.conf.settings`.
- All requests use the Read Access Token in the `Authorization: Bearer` header.
- **Timeout:** configurable; requests raise `requests.Timeout` on slow responses.
- **Rate limiting:** HTTP 429 responses trigger a retry using the `Retry-After` header value; a maximum retry count prevents infinite loops. After exhaustion the client raises `TMDBError`.
- **Error handling:** HTTP 401 and other non-2xx responses raise `TMDBError` with the status code; `requests.ConnectionError` is also caught and re-raised.

### Caching (`backend/entertainment/cache_utils.py`)

- Uses Django's `cache` framework (`django.core.cache`).
- When `REDIS_URL` is set Django uses the Redis cache backend; otherwise local-memory cache is the fallback.
- TTLs are set per endpoint category (e.g. trending: shorter TTL; genres: longer TTL).
- Cache keys are deterministic from the endpoint path and query parameters so different filter combinations are cached independently.

### Services

| Module | Responsibility |
|--------|---------------|
| `tmdb_client.py` | Low-level HTTP, auth, retries, error handling |
| `movie_service.py` | Trending, popular, top-rated, now-playing, upcoming, detail — with adult-content filtering |
| `tv_service.py` | Trending, popular, top-rated, on-the-air, detail — with adult-content filtering |
| `search_service.py` | `search_movies`, `search_tv`, `search_multi` (person entries filtered out), `get_genres`, `discover_media` |

---

## 3. Models Created and Migration

### `WatchlistItem` model (`backend/entertainment/models.py`)

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `user` | FK → `settings.AUTH_USER_MODEL` | `on_delete=CASCADE` |
| `media_type` | CharField | `"movie"` or `"tv"` |
| `tmdb_id` | IntegerField | TMDB numeric ID |
| `title` | CharField | Movie title or show name |
| `poster_path` | CharField (nullable) | TMDB poster path; `null` stored as `null` |
| `poster_url` | SerializerMethodField | Full URL or `null` when `poster_path` is empty |
| `created_at` | DateTimeField (auto) | |

Unique constraint: `(user, media_type, tmdb_id)` — prevents duplicate watchlist entries.

**Migration file:** `backend/entertainment/migrations/0001_initial.py`

No new `Movie` or `TVShow` database models were created. TMDB data is served live (with caching) rather than synced to local tables, keeping the database free of stale metadata.

---

## 4. API Endpoints — Full URLs

All endpoints are prefixed with `/api/v1/`.

| # | Method | Full URL | Auth required | Description |
|---|--------|----------|---------------|-------------|
| 1 | GET | `/api/v1/movies/trending/` | No | Trending movies (supports `time_window=day\|week`) |
| 2 | GET | `/api/v1/movies/popular/` | No | Popular movies (paginated) |
| 3 | GET | `/api/v1/movies/top-rated/` | No | Top-rated movies |
| 4 | GET | `/api/v1/movies/now-playing/` | No | Now playing in cinemas |
| 5 | GET | `/api/v1/movies/upcoming/` | No | Upcoming releases |
| 6 | GET | `/api/v1/movies/{movie_id}/` | No | Movie detail by TMDB ID |
| 7 | GET | `/api/v1/tv/trending/` | No | Trending TV shows |
| 8 | GET | `/api/v1/tv/popular/` | No | Popular TV shows |
| 9 | GET | `/api/v1/tv/top-rated/` | No | Top-rated TV shows |
| 10 | GET | `/api/v1/tv/on-the-air/` | No | Currently airing shows |
| 11 | GET | `/api/v1/tv/{show_id}/` | No | TV show detail by TMDB ID |
| 12 | GET | `/api/v1/entertainment/search/` | No | Search movies + TV (min 2-char query; `q` param) |
| 13 | GET | `/api/v1/entertainment/genres/` | No | Genre list for movies and TV |
| 14 | GET | `/api/v1/entertainment/discover/` | No | Filtered/sorted discovery (`genre`, `media_type`, `sort_by`) |
| 15 | GET | `/api/v1/watchlist/` | **Yes** | List authenticated user's watchlist items |
| 16 | POST | `/api/v1/watchlist/` | **Yes** | Add item; returns 201 (new) or 200 (duplicate) |
| 17 | DELETE | `/api/v1/watchlist/{id}/` | **Yes** | Remove own watchlist item; 404 for another user's item |

---

## 5. Frontend Pages Implemented

| Route | Source file |
|-------|-------------|
| `/movies` | `frontend/src/app/movies/page.tsx` |
| `/movies/trending` | `frontend/src/app/movies/trending/page.tsx` |
| `/movies/popular` | `frontend/src/app/movies/popular/page.tsx` |
| `/movies/top-rated` | `frontend/src/app/movies/top-rated/page.tsx` |
| `/movies/upcoming` | `frontend/src/app/movies/upcoming/page.tsx` |
| `/movies/[id]` | `frontend/src/app/movies/[id]/page.tsx` |
| `/shows` | `frontend/src/app/shows/page.tsx` |
| `/shows/[id]` | `frontend/src/app/shows/[id]/page.tsx` |
| `/search` | `frontend/src/app/search/page.tsx` |

**Supporting additions:**

- `frontend/src/lib/entertainmentApi.ts` — API client functions for all 17 endpoints.
- `frontend/src/types/entertainment.ts` — TypeScript interfaces for `Movie`, `TVShow`, `WatchlistItem`, `Genre`, `SearchResult`.

The build compiled **21 routes total** (19 static, 2 dynamic), which includes the 9 new Phase 5 routes alongside the 12 existing Phase 1–4 routes.

---

## 6. Search and Filtering

### Search (`/api/v1/entertainment/search/`)

- Query parameter: `q` (minimum 2 characters; a 1-character query returns HTTP 400 with a validation message).
- Backend calls `search_multi` on TMDB and **filters out person-type results**, returning only movies and TV shows.
- Results include a `media_type` field (`"movie"` or `"tv"`) so the frontend can render distinct cards.
- Adult content is excluded (`include_adult=false` is always passed).

### Discovery (`/api/v1/entertainment/discover/`)

- Supports `genre` (TMDB genre ID), `media_type` (`movie` or `tv`), `sort_by` (TMDB sort fields), and `page`.
- `include_adult=false` is always injected into the TMDB request regardless of query parameters.
- Results are paginated; the response envelope includes `page`, `total_pages`, and `results`.

### Frontend search page

- Debounced input (avoids firing on every keystroke).
- Loading skeleton states while fetching.
- Empty-state component when no results are found.
- Error state on network or API failure.
- Results grouped by type with `MediaCard` components from the Phase 4 design system.

---

## 7. Watchlist Integration

- The `WatchlistItem` model links to the authenticated user via a foreign key.
- **Add:** POST `/api/v1/watchlist/` with `{ media_type, tmdb_id, title, poster_path }`. Returns 201 on creation; returns 200 (not an error) on a duplicate request to avoid client-side confusion.
- **Remove:** DELETE `/api/v1/watchlist/{id}/`. Ownership is enforced — attempting to delete another user's item returns 404.
- **List:** GET `/api/v1/watchlist/` returns only the authenticated user's items.
- Unauthenticated requests to any watchlist endpoint return HTTP 401.
- `poster_url` is computed at serialization time: an empty or null `poster_path` produces a `null` `poster_url` rather than a broken image URL.

---

## 8. Test Results

### Backend — 53 tests, all pass

```
Ran 53 tests in 8.295s
OK
```

| File | Tests | Result |
|------|-------|--------|
| `test_tmdb_client.py` | 6 | ✅ Pass |
| `test_movie_service.py` | 7 | ✅ Pass |
| `test_tv_service.py` | 8 | ✅ Pass |
| `test_search_service.py` | 10 | ✅ Pass |
| `test_views.py` | 13 | ✅ Pass |
| `test_watchlist.py` | 9 | ✅ Pass |
| **Total** | **53** | **✅ All pass** |

**Coverage by file:**

- **`test_tmdb_client.py`** — successful GET, 401 error, 429 retry with `Retry-After: 0`, 429 max retries exhausted, `requests.Timeout`, `requests.ConnectionError`.
- **`test_movie_service.py`** — all five listing functions, adult-content filtering, movie detail id match.
- **`test_tv_service.py`** — all four listing functions, adult-content filtering, TV detail id match.
- **`test_search_service.py`** — `search_movies` (results + short query raises `ValueError`), `search_tv`, `search_multi` (person entries filtered out), `get_genres`, `discover_media` (`include_adult=false` always passed).
- **`test_views.py`** — `MovieTrendingView` (200, results key, pagination), `MovieDetailView` (200 + 404 `TMDBError`), `TVTrendingView`, `SearchView` (valid → 200, 1-char → 400), `GenreListView`, `DiscoverView`.
- **`test_watchlist.py`** — unauthenticated 401, authenticated empty list, POST 201, duplicate POST 200, DELETE own 204, DELETE other's 404, empty `poster_path` → null `poster_url`.

All TMDB calls are mocked; no test depends on live TMDB availability.

---

## 9. Frontend Validation Results

### Lint — Pass (warnings only)

`eslint` exited 0. Four advisory warnings, zero errors:

| File | Warning |
|------|---------|
| `src/app/complete-profile/page.tsx:191` | `<img>` should be `<Image />` (`next/next/no-img-element`) |
| `src/app/profile/page.tsx:115` | `<img>` should be `<Image />` (`next/next/no-img-element`) |
| `src/app/verify-email/page.tsx:38` | `verified` missing from `useEffect` dependency array |
| `src/components/navigation/AppShell.tsx:54` | `fetchSocialCounts` missing from `useEffect` dependency array |

The last two warnings are in pre-Phase-5 files and are outside the Phase 5 change scope.

### Type-check — Pass

```
npx tsc --noEmit   →   exit 0, no errors
```

### Build — Success

```
npm run build   →   exit 0
```

Compiled 21 routes: 19 static, 2 dynamic.

---

## 10. Remaining Issues and Known Limitations

| # | Category | Description |
|---|----------|-------------|
| 1 | Lint (advisory) | Two `<img>` → `<Image />` warnings in pre-Phase-5 pages (`complete-profile`, `profile`). These do not affect functionality; fixing them requires product decisions about image sizing props. |
| 2 | Lint (advisory) | Two missing `useEffect` dependency warnings in `verify-email/page.tsx` and `AppShell.tsx`. These are pre-Phase-5 files; changing the dependency arrays may alter runtime behaviour and is a product decision. |
| 3 | No playback | Phase 5 is discovery only. Movie and TV detail pages show a clearly labelled "Coming Soon" state for playback. Streaming integration is deferred to a future phase. |
| 4 | Live sync | Movie and TV metadata is not persisted to local database tables; it is fetched live from TMDB (with caching). Long-term, this means no offline fallback if TMDB is unreachable and the cache is cold. |
| 5 | No git repository | The workspace root has no git repository, so no commit was recorded for this phase's changes. |
| 6 | ESLint devDependency | `eslint@8` and `eslint-config-next` were added to `frontend/package.json` devDependencies during Step 10 (they were present in `node_modules` but not declared). This is now consistent. |

---

*Phase 5 is complete. All 53 backend tests pass, the frontend build is clean, and all 17 API endpoints are documented. Do not begin Phase 6 until the user confirms.*

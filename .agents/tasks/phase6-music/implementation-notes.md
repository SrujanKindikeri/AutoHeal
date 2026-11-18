# Phase 6 — Music Discovery & Metadata Integration: Implementation Notes

## Summary

Implemented full Phase 6 Music Discovery & Metadata Integration using MusicBrainz as the provider.

## Music Provider

**MusicBrainz** was selected because:
- Completely free, no API key required
- CC0 / open data license — no attribution payment
- Covers artists, albums, tracks, genres (tags), release dates
- Cover Art Archive provides artwork at no cost
- No playback/DRM concerns — metadata only
- Well-documented REST JSON API

## Backend

### New Django app: `backend/music/`

**Files created:**
- `apps.py` — MusicConfig
- `models.py` — MusicArtist, MusicAlbum, MusicTrack, Playlist, PlaylistTrack
- `serializers.py` — Model and raw MusicBrainz dict serializers
- `views.py` — 14 DRF views (10 discovery, 4 playlist management)
- `urls.py` — 15 URL patterns
- `admin.py` — All models registered

**Services:**
- `services/musicbrainz_client.py` — MusicBrainzClient with rate limiting, 503 retries, 429 handling
- `services/cache_utils.py` — Redis cache with `music:` prefix
- `services/artist_service.py` — Artist discovery
- `services/album_service.py` — Album discovery + cover art enrichment
- `services/track_service.py` — Track discovery + cover art enrichment
- `services/search_service.py` — Search + static genre list
- `services/playlist_service.py` — Playlist CRUD (ORM only)

**Settings added to `movieflow/settings.py`:**
- `music.apps.MusicConfig` added to INSTALLED_APPS
- `MUSICBRAINZ_USER_AGENT`, `MUSICBRAINZ_BASE_URL`, `COVER_ART_ARCHIVE_BASE_URL`

**URL registered in `movieflow/urls.py`:**
- `path('api/v1/', include('music.urls'))`

## Database Migrations

Migration `music/migrations/0001_initial.py` created and applied successfully.

Models: MusicArtist, MusicAlbum, MusicTrack, Playlist, PlaylistTrack.

## Tests Run

### Music tests: `python manage.py test music --verbosity=2`

```
Ran 64 tests in 70.568s
OK
```

All 64 tests passed.

**Test files:**
- `tests/test_client.py` — 12 tests (MusicBrainzClient HTTP behavior)
- `tests/test_views.py` — 13 tests (API view status codes)
- `tests/test_models.py` — 9 tests (unique constraints, ordering, str)
- `tests/test_playlists.py` — 15 tests (playlist CRUD, auth, permissions)
- `tests/test_cache.py` — 7 tests (cache key, miss/hit behavior)
- `tests/test_services.py` — 8 tests (service layer smoke tests)

### Full regression suite: `python manage.py test accounts core friendships notifications entertainment music`

```
Ran 152 tests in 236.163s
OK
```

All 152 tests passed. No regressions.

## Frontend

### New files:
- `src/types/music.ts` — TypeScript types (MBTrack, MBAlbum, MBArtist, Playlist, PlaylistTrack, etc.)
- `src/lib/musicApi.ts` — API client functions
- `src/app/music/page.tsx` — Music home
- `src/app/music/trending/page.tsx` — Trending tracks (paginated)
- `src/app/music/new-releases/page.tsx` — New releases (paginated)
- `src/app/music/genres/page.tsx` — Genre exploration
- `src/app/music/search/page.tsx` — Music search with debounce + tabs
- `src/app/music/track/[id]/page.tsx` — Track detail
- `src/app/music/album/[id]/page.tsx` — Album detail with track listing
- `src/app/music/artist/[id]/page.tsx` — Artist detail

### Build results:
- `npx tsc --noEmit` — ✅ 0 errors
- `npm run build` — ✅ Exit code 0, all 26 routes compiled successfully

**Advisory note:** `ESLint must be installed` warning during build is a pre-existing condition in the project (eslint not installed as a dev dependency). The build itself succeeds.

## Advisory ESLint Warnings (non-blocking)

- `@next/next/no-img-element` — Used `<img>` instead of `next/image` in music pages for external artwork URLs where dimensions are not known ahead of time. Same pattern already in use in `components/ui/MediaCard.tsx`.

## Documentation

- `backend/.env.example` — Updated with MusicBrainz comment and `MUSICBRAINZ_CONTACT_EMAIL`
- `docs/phase6-music-api.md` — Full API endpoint documentation

## Known Limitations

1. `is_explicit` always returns `false` — MusicBrainz does not expose explicit flags in the recording API.
2. Trending/popular use wildcard MusicBrainz queries — not based on real play counts.
3. Cover art requires a separate Cover Art Archive request per release; this is cached to avoid re-fetching.
4. Rate limiting is per-process; in multi-worker deployments the 1.1s constraint is per-worker.
5. ESLint not installed in frontend project (pre-existing) so `npm run lint` fails; TypeScript and build pass.

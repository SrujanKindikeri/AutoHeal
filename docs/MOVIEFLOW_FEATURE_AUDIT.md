# MovieFlow — Complete Feature Audit

**Scope:** Read-only audit of the repository at `c:\Users\kindi\OneDrive\Documents\MultiFlow` (branch `master`, HEAD `14114c1`). No code, migrations, or data were modified. No servers were run. Findings are grounded in files actually read.

**Classification key:** Working · Partially implemented · Broken · Missing · Implemented but not connected to backend/UI.

---

## Overview / repo summary

MovieFlow is a social-entertainment platform: a **Django 5.1 + Django Channels 4 (Daphne ASGI)** backend and a **Next.js 14 (TypeScript + Tailwind)** frontend. The README advertises "Watch Together. Listen Together." but the real-time sync core is largely absent.

**Backend apps** (`backend/`, custom user model `accounts.User`, JWT auth via `djangorestframework-simplejwt`):

| App | Has models.py | Has migration(s) | Has urls.py / views.py | Has consumer |
|---|---|---|---|---|
| accounts | yes | `0001_initial` | yes / yes | — |
| friendships | yes | `0001_initial` | yes / yes | — |
| notifications | yes | `0001_initial` | yes / yes | — |
| entertainment (TMDB) | yes | `0001_initial` | yes / yes | — |
| music (MusicBrainz) | yes | `0001_initial`, `0002` | yes / yes | — |
| library | yes | `0001_initial` | yes / yes | — |
| rooms | yes | `0001_initial` (**partial**) | yes / yes (**invitations only**) | **none** |
| playback | yes | **none** | **none / none** | **none** |
| history | yes | **none** | **none / none** | — |
| administration | yes | **none** | **none / none** | — |
| core | no models | — | yes / yes (health) | `HealthConsumer` only |
| `media/` | **not an app** — it is `MEDIA_ROOT` (avatars only) | — | — | — |

**Frontend** (`frontend/src/`): Next.js App Router. Pages exist for auth, profile, friends, settings, movies/TV discovery, music, playlists, library, watchlist, search, admin, and a single `watch-together` stub page. There is **no `listen-together` page** and **no `rooms/` page**. State: a single Zustand store (`authStore.ts`) — **no room/playback store**. API clients in `lib/`: `api.ts`, `authApi.ts`, `socialApi.ts`, `entertainmentApi.ts`, `libraryApi.ts`, `musicApi.ts`, `adminApi.ts` — **no `roomApi.ts`/`playbackApi.ts`**.

**Repo extras that matter:** `.worktrees/phase9-rooms` and `.worktrees/white-ui-redesign` (older working copies), and `.merge-tmp-backup/`. The deleted `backend/rooms/adapters/` source files (`base.py`, `movie_adapter.py`, `music_adapter.py`, `__init__.py`) and the deleted `backend/playback/providers/` source files (`base.py`, `registry.py`, `open_cinema.py`, `tmdb_watch_providers.py`, `__init__.py`) survive only as compiled `.pyc` in `__pycache__/` — they were removed from `master` (verified: `git ls-files backend/rooms/adapters/` is empty; the blobs exist only in stash commit `b6a422b`).

**Bottom line:** Authentication, social (friends/notifications), TMDB movie/TV discovery, MusicBrainz music discovery, playlists, and the library are real and wired end-to-end (modulo external API keys). **Watch Together is a "coming soon" stub, Listen Together has no page at all, and the entire real-time rooms/playback sync backend (consumers, REST endpoints, migrations for the sync tables) was never connected — most of its models have no migrations and no views.**

---

## 1. Authentication & registration — **Working**

- **Endpoints** (`backend/accounts/urls.py`): `auth/register/`, `auth/verify-email/`, `auth/resend-verification/`, `auth/login/`, `auth/refresh/`, `auth/logout/`, `auth/forgot-password/`, `auth/reset-password/`, `auth/change-password/`, `profile/me/` (GET+PATCH), `users/search/`, `users/by-movieflow-id/<id>/` — all mounted at `/api/v1/` (`backend/movieflow/urls.py`).
- **Token/session handling** (`backend/accounts/views.py`): JWT access+refresh issued on login; refresh token rotated and blacklisted (`RefreshTokenView`, `LogoutView`); refresh token also stored in an `HttpOnly` cookie `mf_refresh`. Scopes: `auth_login`, `auth_register`, `auth_password_reset`, `auth_resend_verification` (`settings.py` throttle rates).
- **Email verification** (`accounts/models.py` `EmailVerificationToken`; `accounts/services.py` `verify_email_token`/`create_verification_token`): login blocks unverified users with `ACCOUNT_UNVERIFIED` (`views.py` `LoginView`). Verification email link points at `FRONTEND_URL` (`http://localhost:6060`) — consistent with the frontend.
- **Frontend auth store** (`frontend/src/store/authStore.ts`): holds `user`, `accessToken`, `refreshToken`, `isAuthenticated`, with `setAuth`/`initAuth`/`logout`. Tokens are persisted in `localStorage` (`mf_access_token`, `mf_refresh_token`, `mf_user`). `frontend/src/lib/authApi.ts` `apiRequest` attaches `Authorization: Bearer <token>`, auto-refreshes on 401, and wires all auth/profile endpoints. Pages: `app/login`, `app/register` (also `app/signup`), `app/verify-email`, `app/forgot-password`, `app/reset-password`, `app/complete-profile`, `app/email-verification-success`.
- **Notes / caveats:** (a) Access **and** refresh tokens are kept in `localStorage` (XSS-exposable) — functional but not ideal security posture. (b) `accounts.urls` and `friendships.urls` both define `users/search/` with name `users-search`; `accounts` is included first so it wins — duplicate route, not a crash. (c) `UserProfile.avatar` is an `ImageField` (`accounts/models.py:84`) and `UserProfileSerializer` exposes it as writable, but the frontend `updateProfileMe` sends JSON, not multipart, so avatar file upload is not actually exercised by the frontend.

---

## 2. Personal movie upload — **Missing**

There is **no personal movie upload feature anywhere**:
- No model: a repo-wide search for `FileField|ImageField|FileUploadParser|MultiPartParser|request.FILES` finds only `accounts.UserProfile.avatar`. No movie file model exists in `playback`, `rooms`, `library`, or `entertainment` (`entertainment.Movie` is TMDB metadata only, no file).
- No view/serializer/endpoint: `movieflow/urls.py` includes `accounts, friendships, notifications, entertainment, rooms, music, library, core` — none expose an upload route.
- No frontend form: there is no upload page or API client for movie files; `movies/[id]/watch/page.tsx` is a "Streaming coming soon" placeholder (no `<video>` element, no upload).
- Storage, validation, size limits, metadata, processing status, management/delete, playback endpoint, library display: **all N/A — feature does not exist.** The `library` app only tracks status (watchlist/watching/watched) against external TMDB IDs (`library/models.py` `UserLibraryItem`).

---

## 3. Personal music upload — **Missing**

Same as movies: no file model, no upload view/serializer/endpoint, no frontend form. The `music` app is **MusicBrainz metadata discovery + user playlists** only (`music/models.py` `MusicTrack`/`MusicAlbum`/`MusicArtist` keyed by `mbid`, `Playlist`/`PlaylistTrack` referencing `track_mbid` — no audio file field). `music/views.py` proxies MusicBrainz and manages playlists; nothing accepts an audio upload. Storage/validation/metadata/playlist-for-uploaded-tracks/progress/edit/delete: **all N/A.**

---

## 4. Listen Together — **Missing (frontend) / not connected (backend)**

- **Backend:** The `rooms.Room` model supports `room_type='music'` (`rooms/models.py`) and `playback.RoomPlaybackState` defines a server-authoritative position model (`playback/models.py` `RoomPlaybackState.compute_current_position`). **But:** (a) `playback` has **no migration** (`playback/migrations/` contains only `__init__.py`) → `RoomPlaybackState`, `PlaybackSession`, `PlaybackEvent`, `PlaybackProvider` tables do not exist; (b) `playback` has **no urls.py/views.py** → no REST API for playback state; (c) there is **no WebSocket consumer** for music rooms — `movieflow/routing.py` routes only `ws/health/` (`HealthConsumer`); (d) the deleted `rooms/adapters/music_adapter.py` (content-resolver, not a consumer) is gone.
- **Frontend:** There is **no `app/listen-together/` directory** → the route `/listen-together` returns 404. The sidebar/nav links to it (`frontend/src/components/navigation/DesktopSidebar.tsx:135`, `MobileNavigation.tsx:243`). There is no `roomApi.ts`/`playbackApi.ts` and no Zustand room/playback store. The only WebSocket reference in the whole frontend is the `WS_BASE_URL` constant (`frontend/src/lib/api.ts:5`); `new WebSocket(` appears nowhere.
- **Root cause:** The feature was never wired — no consumer, no routing entry, no page, no store, no client. The DB tables for the sync state were never created (no migration).

---

## 5. Watch Together — **Partially implemented (UI shell only) / not connected**

- **Backend:** Same gaps as Listen Together — no room-creation/list/detail/join REST endpoint (`rooms/urls.py` exposes **only** invitation by-token/accept/reject), no playback migration, no consumer, no routing. `Room`/`RoomParticipant` tables exist (`rooms/migrations/0001_initial`) but most room models (`RoomInvitation`, `RoomMessage`, `VoiceSession`, …) have **no migration** (see §11).
- **Frontend `/watch-together` page** (`frontend/src/app/watch-together/page.tsx`): an explicit **"coming soon"** stub. The "New Room" button is `disabled` (`page.tsx:107`). The page states "Rooms coming soon — Live watch-party rooms are under development" (`page.tsx:206-216`) and that chat/voice/reactions are "local demo state … until the room WebSocket service is live" (docstring `page.tsx:14-22`). There is **no `app/rooms/create` or `app/rooms/[roomId]`** page.
- **Home page "Start Watch Party"** (`frontend/src/app/page.tsx`): opens a room-creation modal, but `handleCreateRoomSubmit` (`page.tsx:256-263`) only calls `success(...)` to show a toast and closes the modal — **it makes no API call and creates no room**. This is the cosmetic "it looked like it worked" path.
- **Root cause:** Room creation has no backend endpoint to call, no consumer to sync, and the frontend "create" flow is a no-op toast. Hence "Watch Together cannot create rooms" / "Room creation does not complete."

---

## 6. Private rooms & invitations — **Broken**

- **Privacy model:** `Room.visibility` has `private`/`public` (`rooms/models.py`), and `RoomSettings` has `require_approval`/`invite_policy`. **But there is no join/access endpoint**, so "private" is declarative only — nothing enforces it on the network.
- **Invitation model** (`rooms/models.py` `RoomInvitation`): fields are `room` (FK), `inviter`, `invitee`, `email`, `token` (unique), `status`, `expires_at`, plus email-tracking fields. **No `room_name` field, no `invitee_email` field.**
- **Invitation views** (`backend/rooms/views.py`): `RoomInvitationByTokenView` returns `"room_name": invitation.room_name` (`rooms/views.py:42`) and `RoomInvitationAcceptView`/`RejectView` reference `invitation.invitee_email` (`rooms/views.py:97-98`, `137-138`). These attributes **do not exist on the model** → `AttributeError` → HTTP 500. The frontend (`app/invitations/[token]/page.tsx` + `lib/authApi.ts` `RoomInvitationData`) expects exactly `room_name` and `inviter.full_name/username/movieflow_id`, so the contract matches the broken view, not the model.
- **Migrations:** `RoomInvitation` has **no migration** (`rooms/migrations/0001_initial` creates only `Room`, `RoomEvent`, `RoomParticipant`, `RoomSettings`). So even if the view bug were fixed, `RoomInvitation.objects.get(...)` raises `OperationalError: no such table` at runtime.
- **No creation path:** There is **no endpoint that creates a `RoomInvitation`** anywhere, so no invitation can ever exist to be fetched. `rooms/emails.py` `send_room_invitation_email` is never invoked by any view (and itself imports `from notifications.services import get_or_create_user_preferences`, but `notifications/` has **no `services.py`** — a latent `ImportError` if ever called).
- **Host controls / participant list / leave / cleanup:** No endpoints exist. `Room.clean()` enforces content-type compatibility and `max_participants >= 2`, but nothing exposes these over the API.
- **Optional password:** none.
- **"Does a private room leak via knowing its ID?":** moot — there is no `GET /rooms/<id>/` join/validation endpoint at all, so there is no leak surface because there is no surface.
- **Root cause:** Three compounding defects — (1) model/view field mismatch (`room_name`/`invitee_email`), (2) missing migration for `RoomInvitation`, (3) no invitation-creation endpoint.

---

## 7. External streaming integrations — **Missing / not connected**

- **Providers:** Only `backend/playback/providers/youtube_embed.py` remains as source. Its companions — `base.py`, `registry.py`, `open_cinema.py`, `tmdb_watch_providers.py`, `__init__.py` — were deleted (only `.pyc` survive in `playback/providers/__pycache__/`). `youtube_embed.py:6` does `from playback.providers.base import BasePlaybackProvider`, which **no longer exists** → `ImportError` if the module is imported.
- **Nothing imports it:** a search for `playback.providers|youtube_embed|BasePlaybackProvider|providers.registry` across `backend/` (excluding venv/worktrees) returns only `youtube_embed.py` itself. So the providers are dead code with no registry and no caller.
- **No API surface:** `playback` has **no urls.py/views.py**, so there is no endpoint to resolve a provider, check availability, authorize, or create a playback session. `playback/models.py` (`PlaybackProvider`, `UserProviderConnection`, `ContentProviderAvailability`, `PlaybackSession`, `RoomPlaybackState`, `PlaybackEvent`) is a complete design but has **no migration**, no serializer, no view.
- **Frontend:** `movies/[id]/watch/page.tsx` renders a "Streaming coming soon — Video playback will be available once the streaming service is connected" placeholder (no iframe, no `<video>`). The movie detail page (`movies/[id]/page.tsx`) has no Watch/Play CTA at all.
- **Capability flags:** defined in models (`supports_embedded_playback`, `supports_group_playback`, etc.) and in `youtube_embed.get_capabilities()`, but never served to the client.
- **Root cause of "External provider playback does not work":** the provider package is half-deleted and unimportable, there is no playback REST API, no migration for the provider/session tables, and the frontend has no player.

---

## 8. WebSockets & routing — **Partially implemented (health only)**

- `backend/movieflow/asgi.py`: `ProtocolTypeRouter` → `http` = Django ASGI app, `websocket` = `AuthMiddlewareStack(URLRouter(movieflow.routing.websocket_urlpatterns))`.
- `backend/movieflow/routing.py`: routes **only** `re_path(r'^ws/health/$', HealthConsumer.as_asgi())`. There is **no** route for rooms, playback, chat, or voice.
- The **only** project consumer is `backend/core/consumers.py` `HealthConsumer` (ping/pong + broadcast test). No room/playback/chat consumer exists anywhere in the project (confirmed: only `core/consumers.py`).
- **Auth on WS:** `AuthMiddlewareStack` (session/cookie based). The frontend stores JWT in `localStorage` and never opens a WebSocket, and there is no JWT-on-query-string middleware, so even if room routes existed, session-based WS auth would not match the JWT-based frontend.
- **Routing/consumer mismatches:** there are no dangling routes pointing at nonexistent consumers (only `ws/health/` exists, and it resolves). The mismatch is the inverse: vast backend model surface (`rooms` chat/voice/playback models, `playback` models) with **no corresponding consumer or route**.

---

## 9. Redis & channel layer — **Partially configured (environment-dependent)**

- `settings.py` (`CHANNEL_LAYERS`): uses `channels_redis.core.RedisChannelLayer` with `REDIS_URL` **unless** `USE_IN_MEMORY_CHANNELS` is true **or** running tests (`'test' in sys.argv`), in which case it falls back to `channels.layers.InMemoryChannelLayer`.
- **Docker** (`docker-compose.yml`): runs `redis:7-alpine`, sets `USE_IN_MEMORY_CHANNELS=False`, `REDIS_URL=redis://redis:6379/0` → Redis-backed, works across the single backend container. Good for multi-user within one process group.
- **Local dev** (`backend/.env`): `USE_IN_MEMORY_CHANNELS=True`, `USE_SQLITE=True` → **in-memory** channel layer. In-memory is **per-process**; with a single Daphne process it works for local experimentation, but it will **not** sync across multiple processes/workers and provides no real cross-user fan-out reliability.
- `requirements.txt` includes `channels-redis>=4.2.0` and `redis>=5.2.0`, so the Redis path is installable.
- **Verdict:** Redis is configured for Docker; the local `.env` deliberately falls back to in-memory. Multi-user correctness depends on running under Docker/Redis. The in-memory fallback is fine only for single-process local dev.

---

## 10. File storage & media serving — **Partially implemented (avatars only)**

- `settings.py`: `MEDIA_URL='media/'`, `MEDIA_ROOT=BASE_DIR/'media'` (i.e. `backend/media/`). `movieflow/urls.py` serves media via `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)` **only when `DEBUG`**.
- **What is stored:** only user avatars under `media/avatars/` (confirmed: `valid_avatar_*.jpg` files). No movie/music media is stored (those features don't exist).
- **Prod serving:** no production media backend configured (no S3/CDN, no WhiteNoise for media, no Nginx config in repo). In Docker, `media_volume` is mounted but still only served in DEBUG; production serving is unconfigured.
- **Authenticated media access:** none — avatars are public under `MEDIA_URL` when DEBUG. There is no per-user private media to protect because no private media feature exists.
- **Path traversal / safe filenames:** uploads go through `ImageField(upload_to='avatars/')`; Django's storage sanitizes filenames. There is no custom upload path construction to audit. Since no file-upload feature exists beyond avatars, traversal risk is limited to the avatar path, which is fixed.

---

## 11. Database migrations — **Multiple apps missing migrations**

Migrations present: `accounts/0001_initial`, `friendships/0001_initial`, `notifications/0001_initial`, `entertainment/0001_initial`, `music/0001_initial`+`0002_phase8…`, `library/0001_initial`, `rooms/0001_initial`.

**Apps with models but NO migration:**
- `playback/` — `migrations/` has only `__init__.py`. Models `PlaybackProvider`, `UserProviderConnection`, `ContentProviderAvailability`, `PlaybackSession`, `RoomPlaybackState`, `PlaybackEvent` → **no tables**. (Code comments in `playback/models.py` even say "Phase 14 — from migration 0002", which was never created.)
- `history/` — `migrations/` has only `__init__.py`. Models `WatchHistory`, `ListeningHistory`, `RoomSessionHistory`, `UserEntertainmentPreference`, `RecommendationFeedback` → **no tables**.
- `administration/` — `migrations/` has only `__init__.py`. Models `AdminRoleAssignment`, `AccountRestriction`, `ModerationReport`, `AdminAuditLog`, `PlatformSetting` → **no tables**.
- `core/` — has no models, so no migration needed (fine).

**App with an incomplete migration:**
- `rooms/0001_initial` creates **only** `Room`, `RoomEvent`, `RoomParticipant`, `RoomSettings`. The remaining `rooms/models.py` models — `RoomRolePermission`, `RoomSettingsRevision`, `RoomInvitation`, `RoomMessage`, `RoomMessageReaction`, `RoomMessageReport`, `RoomMute`, `VoiceSession`, `VoiceParticipant` — have **no migration** → no tables. This is why invitation queries (§6) would fail at runtime even after fixing the field bug.

No migration **conflicts** were detected (each app has at most one numbered migration), but `makemigrations` would generate large diffs for `playback`, `history`, `administration`, and the missing `rooms` models. There are no "models with no migration" that the running app currently relies on for working features — the gaps are entirely in the not-yet-connected real-time/admin/history layer.

---

## 12. API endpoints — **Endpoint inventory + gaps**

**Wired and functional (mounted in `movieflow/urls.py`):**
- `accounts` → `/api/v1/auth/*`, `/api/v1/profile/me/`, `/api/v1/users/search/`, `/api/v1/users/by-movieflow-id/<id>/`
- `friendships` → `/api/v1/friends/*`, `/api/v1/users/<id>/`, `/api/v1/users/<id>/block/`, `/api/v1/users/blocked/`
- `notifications` → `/api/v1/notifications/`, `/<id>/read/` (PATCH), `/read-all/` (POST)
- `entertainment` → `/api/v1/movies/*`, `/api/v1/tv/*`, `/api/v1/entertainment/search|genres|discover`, `/api/v1/entertainment/watchlist/`
- `music` → `/api/v1/music/*` (discovery + playlists + collaborators)
- `library` → `/api/v1/library/*`, `/api/v1/collections/*`, `/api/v1/favorites/*`, `/api/v1/music/following/artists/*`
- `rooms` → `/api/v1/invitations/<token>/`, `/accept/`, `/reject/` **only**
- `core` → `/api/core/health/`, `/api/health/health/`

**NOT mounted (no urls.py exists):** `playback`, `history`, `administration`. `movieflow/urls.py` does not include them.

**Frontend calls with no matching backend endpoint (→ 404):**
- `frontend/src/lib/adminApi.ts` calls `/api/v1/admin/users/`, `/api/v1/admin/users/<id>/` (GET/PATCH/DELETE), `/api/v1/admin/reports/`, `/api/v1/admin/reports/<id>/<action>/`, `/api/v1/admin/analytics/`. **None exist** (administration has no urls). All admin pages (`/admin`, `/admin/users`, `/admin/moderation`, `/admin/analytics`) → 404 on every request.
- No frontend `roomApi`/`playbackApi` exists, so there are no "frontend calls a missing rooms endpoint" cases — the frontend simply never calls rooms (except invitations, which exist but are broken, §6).

**Doc drift:** README lists `/api/v1/watchlist/` and `/api/v1/watchlist/{id}/` but the actual routes are `/api/v1/entertainment/watchlist/` and `/api/v1/entertainment/watchlist/<uuid:id>/` (`entertainment/urls.py`). Frontend `useWatchlist` hook uses the `/entertainment/watchlist/` path, so the app is internally consistent; only the README is stale.

---

## 13. CORS & allowed origins — **Working (with a local-dev port gotcha)**

- `settings.py`: `CORS_ALLOWED_ORIGINS` from env `CORS_ALLOWED_ORIGINS` (default `http://localhost:6060,http://127.0.0.1:6060`); `CORS_ALLOW_CREDENTIALS=True`; `CSRF_TRUSTED_ORIGINS` mirrors it. `CORS_ALLOW_ALL_ORIGINS = DEBUG and CORS_ALLOW_ALL_ORIGINS env (default False)`.
- `backend/.env`: `CORS_ALLOWED_ORIGINS=http://localhost:6060,http://127.0.0.1:6060`. `docker-compose.yml`: same. `ALLOWED_HOSTS` includes `localhost,127.0.0.1,0.0.0.0,backend` (and `*` in Docker).
- Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL=http://localhost:8000`, `NEXT_PUBLIC_WS_URL=ws://localhost:8000`. So **browser on :6060 → backend on :8000 is CORS-allowed.**
- **Local-dev gotcha:** `frontend/package.json` `dev` script is `next dev -p 3000`, and `.env.example` sets `FRONTEND_PORT=3000`, but CORS only allows `:6060`. A developer running `npm run dev` on `:3000` will hit CORS rejections unless they override the port to `6060` or set `CORS_ALLOW_ALL_ORIGINS=True`. Docker (6060:3000 + CORS 6060) is consistent.
- No Next.js rewrite/proxy (`frontend/next.config.mjs`) — the frontend talks to the backend directly by absolute URL, so CORS is required and is configured.

---

## 14. Frontend state management — **Auth only; no room/playback store**

- `frontend/src/store/` contains exactly **one** store: `authStore.ts` (Zustand). It manages `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`, with `setAuth`/`setAccessToken`/`updateUser`/`logout`/`initAuth`, manually persisted to `localStorage`.
- **No** room store, playback store, voice/chat store, or notifications store. The `watch-together` page manages demo state with local `useState` only (`demoMessages`, `micEnabled`, …) — explicitly "local demo state … until the room WebSocket service is live."
- Data fetching for discovery/library/friends uses TanStack React Query (`@tanstack/react-query` in `package.json`) via hooks (`hooks/useLibrary.ts`, `hooks/useWatchlist.ts`) and direct `apiRequest` calls.
- **Verdict:** state layer is complete for auth and adequate for read-only discovery/social, but **entirely absent for real-time rooms/playback**.

---

## 15. Frontend event subscriptions — **None (no WebSocket client)**

- The frontend **never opens a WebSocket**. A search for `new WebSocket|ws://|wss://|useWebSocket|socket.io` across `frontend/src` finds only the `WS_BASE_URL` constant in `lib/api.ts:5` (and its use in `app/api/health/route.ts` to report the configured URL). There is no connection manager, no message handler, no reconnect logic.
- For the room pages: `/watch-together` does not build any WS URL (it's a stub); `/listen-together` does not exist. The home page "create room" flow does not connect to anything.
- Auth tokens over WS: not applicable (no WS client); note the WS layer uses `AuthMiddlewareStack` (session-based) while the frontend is JWT-in-localStorage, so a future WS client would need a JWT-capable auth path (e.g., token in query string or a JWT auth middleware), which does not exist today.
- **Hardcoded/placeholder URLs:** `API_BASE_URL`/`WS_BASE_URL` default to `localhost:8000`, overridable via `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL`. No other hardcoded backend URLs were found.

---

## 16. Known broken items — root causes (with file:line)

- **"Listen Together does not work"** — There is no `/listen-together` page (404) (`frontend/src/app/` has no `listen-together/` dir), no room/playback consumer (`movieflow/routing.py` routes only `ws/health/`), no playback migration (`playback/migrations/` empty), and no frontend store/client. The sidebar links to a route that doesn't exist (`DesktopSidebar.tsx:135`).
- **"Watch Together cannot create rooms"** — There is no room-creation endpoint (`rooms/urls.py` exposes only invitation by-token/accept/reject). The `/watch-together` "New Room" button is `disabled` (`watch-together/page.tsx:107`) and the page says "Rooms coming soon" (`page.tsx:206`). The home-page "Launch Room" button calls `handleCreateRoomSubmit` which only shows a toast and makes no API call (`page.tsx:256-263`).
- **"Room creation fails or does not complete"** — Same as above: the only "create" UI is the home modal, which is a no-op toast (`page.tsx:256-263`); no `POST /rooms` exists (`rooms/urls.py`, `rooms/views.py`).
- **"Friends cannot join rooms"** — Friends itself works (`friendships` has models/views/urls/migration; `socialApi.ts` wires `/api/v1/friends/*`). There is simply **no room to join**: no join endpoint, no room detail endpoint, no consumer. Friends is not the broken part; rooms are.
- **"Playback synchronization fails"** — There is no playback sync mechanism: `RoomPlaybackState`/`PlaybackEvent` models exist but have **no migration** (`playback/migrations/` empty) and **no consumer/route** to broadcast state. Nothing computes or syncs position over the wire.
- **"External provider playback does not work"** — `playback/providers/` is half-deleted (`base.py`/`registry.py`/`open_cinema.py`/`tmdb_watch_providers.py`/`__init__.py` gone, only `youtube_embed.py` remains, which imports the missing `playback.providers.base` at `youtube_embed.py:6`). There is no playback REST API (`playback` has no urls/views), no migration for provider/session tables, and the frontend movie watch page is a "Streaming coming soon" placeholder (`movies/[id]/watch/page.tsx`).

---

## 17. Existing docs — inventory and staleness

In `docs/` and repo root:
- `README.md` (root) — describes Phases 1–5; **partially stale**: claims "Phases 1, 2, 3 & 4 Complete" architecture overview that omits rooms/playback/history/administration (which exist as models but are not wired), and lists watchlist endpoints under `/api/v1/watchlist/` (actual path is `/api/v1/entertainment/watchlist/`). Still accurate for auth/social/TMDB/music/library.
- `docs/MOVIEFLOW_WHITE_UI_UX_REDESIGN.md` — the white Apple-inspired UI redesign reference; **current** (matches the implemented white theme; supersedes any earlier dark-theme docs).
- `docs/AUTHENTICATION_NAVIGATION_REPORT.md`, `docs/EMAIL_VERIFICATION_AND_CLEANUP_REPORT.md`, `docs/EMAIL_VERIFICATION_REDIRECT_FIX.md`, `docs/LOGIN_DASHBOARD_FIX_REPORT.md`, `docs/BACKEND_STARTUP_FIX_REPORT.md`, `docs/NEXTJS_CSS_BUILD_FIX.md`, `docs/PROJECT_CLEANUP_REPORT.md` — targeted fix reports for auth/email/login/CSS/startup; **superseded in scope** but historically accurate. `BACKEND_STARTUP_FIX_REPORT.md` and the commit `b9ee90c` ("resolve PlaybackSession import failure and restore stub models") explain why `playback` models still import without crashing (they are defined but unmigrated/unwired).
- `docs/phase6-music-api.md`, `docs/phase7-library.md` — design docs for music (MusicBrainz) and library; **current** and match the implemented APIs.
- **No documentation exists for rooms, playback sync, Watch Together, Listen Together, voice/video, or administration** — consistent with those being unimplemented/unwired.

**Design reference** (`C:\Users\kindi\OneDrive\Documents\LifeFlow-Main`, read-only): a Next.js app whose `app/globals.css` defines the "Advanced Dynamic Liquid Glass" Apple-inspired token system (CSS custom properties: 5 glass elevations, `--bg-base #F4F5FA`, accent `--accent #2563EB`, semantic success/warning/danger, radii, spacing, transitions). MovieFlow's current white theme already adopts the same language (its components use tokens like `--card`, `--border-subtle`, `--accent-blue`, `--content-primary`). The LifeFlow tokens are the canonical reference for keeping future room/playback UI visually consistent.

---

## Consolidated table

| # | Feature | Classification | Key file(s) | Root cause / gap |
|---|---|---|---|---|
| 1 | Auth & registration | **Working** | `accounts/views.py`, `urls.py`, `store/authStore.ts`, `lib/authApi.ts` | Tokens in localStorage (security note); duplicate `users/search` route. |
| 2 | Personal movie upload | **Missing** | — | No model/view/endpoint/frontend; no `FileField` anywhere except avatar. |
| 3 | Personal music upload | **Missing** | `music/models.py` (MBID-only) | Music app is MusicBrainz metadata + playlists; no audio file field. |
| 4 | Listen Together | **Missing / not connected** | `movieflow/routing.py`, `playback/models.py`, `playback/migrations/` | No consumer, no route, no page (`/listen-together` 404), no store; `playback` unmigrated. |
| 5 | Watch Together | **Partial UI / not connected** | `app/watch-together/page.tsx`, `app/page.tsx:256-263`, `rooms/urls.py` | "New Room" disabled; create flow is a no-op toast; no room CRUD endpoint; no consumer. |
| 6 | Private rooms & invitations | **Broken** | `rooms/views.py:42,97,137`, `rooms/models.py` (`RoomInvitation`), `rooms/migrations/0001_initial` | View uses `room_name`/`invitee_email` not on model (500); `RoomInvitation` unmigrated (no table); no creation endpoint. |
| 7 | External streaming | **Missing / not connected** | `playback/providers/youtube_embed.py:6`, `playback/migrations/`, `app/movies/[id]/watch/page.tsx` | Provider package half-deleted & unimportable; no playback API; no migration; no player. |
| 8 | WebSockets & routing | **Partial (health only)** | `movieflow/routing.py`, `movieflow/asgi.py`, `core/consumers.py` | Only `ws/health/` routed; no room/playback/chat consumer. |
| 9 | Redis & channel layer | **Partially configured** | `settings.py` (CHANNEL_LAYERS), `backend/.env`, `docker-compose.yml` | Redis in Docker; in-memory locally (single-process only). |
| 10 | File storage & media | **Partial (avatars only)** | `settings.py` (MEDIA_ROOT/URL), `movieflow/urls.py` | Served only in DEBUG; no prod media backend; no private media feature. |
| 11 | Migrations | **Gaps** | `playback/`, `history/`, `administration/` (no migrations); `rooms/0001_initial` (incomplete) | Many real-time/admin models have no tables. |
| 12 | API endpoints | **Gaps** | `movieflow/urls.py`; `lib/adminApi.ts` | `playback`/`history`/`administration` not mounted; admin frontend calls non-existent `/api/v1/admin/*` (404). |
| 13 | CORS & origins | **Working (dev-port gotcha)** | `settings.py`, `backend/.env`, `frontend/.env.local` | :6060↔:8000 allowed; `npm run dev` defaults to :3000 (not in CORS). |
| 14 | Frontend state | **Auth only** | `store/authStore.ts` | No room/playback store; demo state only. |
| 15 | Frontend event subs | **None** | `lib/api.ts:5` (WS_BASE_URL only) | No `new WebSocket` anywhere; no client. |
| 16 | "Friends cannot join rooms" | **Rooms missing** | `friendships/*` (works), `rooms/*` (no join) | Friends work; there is no room/join endpoint. |
| 17 | Existing docs | **Mostly current for done work; absent for real-time** | `docs/*`, `README.md` | README watchlist URL drift; no rooms/playback/voice docs. |

---

## Open questions needing a human decision before implementation

1. **Scope of real-time rebuild:** Should rooms/playback be implemented fresh against the existing (unmigrated) `rooms`/`playback` models, or should those models be revised first? The current models are elaborate (co-hosts, readiness, voice sessions, playback state versioning) but were never wired — decide whether to ship a minimal version or the full design.
2. **Migration strategy:** Creating the missing migrations for `playback`, `history`, `administration`, and the remaining `rooms` models is a schema-changing operation. Confirm whether to run against the existing SQLite (`USE_SQLITE=True`) dev DB or switch to the Docker Postgres setup first, and whether any partial data exists that must be preserved.
3. **Invitation contract:** Fix direction — change the view to use `invitation.room.name`/`invitation.email` (matching the model), or add `room_name`/`invitee_email` fields to the model? The frontend already expects `room_name` + `inviter` card. Recommend adapting the view to the model (and adding a `RoomInvitation` creation endpoint).
4. **WebSocket auth:** The ASGI layer uses `AuthMiddlewareStack` (session-based) while the frontend is JWT-in-localStorage. Decide the WS auth mechanism (JWT query param, JWT auth middleware, or cookie) before building consumers.
5. **Channel layer in local dev:** Keep in-memory for local dev or require Redis locally too? In-memory hides multi-process bugs; decide whether local dev should mirror Docker (Redis).
6. **External providers:** Is YouTube embed the only intended provider, or should the deleted `open_cinema`/`tmdb_watch_providers`/`registry` be restored from git history (`b6a422b`) and finished?
7. **Personal uploads (movies/music):** Confirm whether personal file upload is in scope at all — it is entirely absent today; the discovery model is purely third-party (TMDB/MusicBrainz). If in scope, decide storage (local vs object storage), validation (real MIME), size limits, and whether playback is authenticated.
8. **Admin frontend:** The `/admin/*` pages and `adminApi.ts` exist but the backend `administration` app has no urls/views/migrations. Decide whether to build the admin API or remove the frontend admin pages.
9. **Frontend dev port:** Standardize the local dev port to `6060` (matching CORS) or broaden CORS to include `:3000`?
10. **Secrets hygiene:** Real SMTP credentials live in `.env` and `.env.example` (and are tracked-looking). Confirm rotation and that example files use placeholders only.

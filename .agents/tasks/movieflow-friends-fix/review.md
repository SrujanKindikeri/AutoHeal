# Friends crash fix, Home demo cleanup, and real room creation

This change set fixes the `/friends` client-side crash, removes hardcoded demo content from the Home page, wires real backend calls behind the Watch/Listen room actions, and adds container healthchecks (plus an unrequested monitoring stack). The crash is addressed correctly at the routing layer: a duplicate `users/search/` registration in `accounts/urls.py` was shadowing the friendships view that returns the paginated `{count, total_pages, current_page, results}` dict the frontend expects, so React was calling `.map()` on `undefined`. Removing the duplicate restores the right handler, and a null-safe `PublicUserSerializer` plus a `useCallback` fix in `AppShell` harden the surrounding paths. The Home page drops its fake `POPULAR_MOVIES`/`MUSIC_RECOMMENDATIONS`/Dune catalog in favor of real TMDB-backed endpoints with loading skeletons and empty states, and the fake "Launch Room" toast is replaced with a real `POST /api/v1/rooms/` + invite call. The room-creation endpoints genuinely exist and the creator is auto-added as host, so invites are real — but the created room is hollow: `content_id` is set to the room's name, which can never match a real movie/track id, so the room can't actually play media, and nothing routes the host into the room afterward.

**Watch for:** rooms created from Home can't play anything (content binding is faked with the room name) and there's no way to enter a created room; the monitoring stack is unrelated to this task and ships Grafana with a default admin password.

**Verdict**: NEEDS_CHANGES

## High-level view

The `/friends` crash was a URL-registration collision, not a component bug. Both `accounts/urls.py` and `friendships/urls.py` registered `users/search/`; because accounts is included first, its plain-list view won and the frontend's `searchResults.results.map(...)` blew up on `undefined`. The fix deletes the duplicate route so the friendships `UserSearchView` — which returns the paginated dict — is the active handler.

`PublicUserSerializer` was hardened so a `User` with no `Profile` no longer raises during search/friend serialization. The five profile-backed fields are now `SerializerMethodField`s guarded by `getattr(obj, 'profile', None)`. This is defensive hardening against the same class of crash, applied at the serializer the friends and search paths both share.

The Home page was rewritten to consume only real APIs: friends and incoming requests from the friendships endpoints, and trending movies/TV from the entertainment (TMDB-proxy) endpoints, each with loading and empty states. The hardcoded demo catalog (`POPULAR_MOVIES`, `MUSIC_RECOMMENDATIONS`, the Dune hero, the fake "Playing trailer" toast and watchlist toggle) was deleted outright.

The fake "Launch Room" success toast is now a real `createRoom` + `inviteToRoom` against `POST /api/v1/rooms/` and `POST /api/v1/rooms/{id}/invite/`. Both endpoints exist, the creator is auto-added as a host participant by the backend, and invitations are persisted — so this is a genuine action, not a fake success. The gap is in what the room is bound to and where the host goes next.

The infra commit adds backend and frontend healthchecks and makes the frontend `depends_on: backend healthy`. It also adds a full Prometheus/Grafana/node-exporter/cAdvisor stack that no phase asked for, exposing four host ports and shipping Grafana with a default admin/admin password.

<details>
<summary>Issues (3)</summary>

1. **Room content not bound to real media** — `roomApi.createRoom` sets `content_id` and `content_title` to the room's name, not a real movie/track id; `library/views.py` authorizes playback by matching `room__content_id` to the actual media id, so a room created from Home can never play anything. Have the user select a movie/track (or personal upload) when creating the room and pass its real id as `content_id`.
2. **No entry point to created rooms; getMyRooms is dead code** — `handleCreateRoomSubmit` only toasts after creating a room and never routes the host in; `getMyRooms` is defined but never called and the Home "Upcoming Rooms" section is a permanent static empty state. Route the host into the room/lobby after creation and drive that section from `getMyRooms`, or remove the unused function.
3. **Out-of-scope monitoring stack with weak default credentials** — the infra commit adds Prometheus/Grafana/node-exporter/cAdvisor (4 always-on containers, host ports 9090/9100/8080/3000) the task never requested, with Grafana defaulting to admin/admin. Keep the healthchecks; move the monitoring stack to a separate compose profile or drop it from this change, and don't ship Grafana with a default admin password.

</details>

<details>
<summary>Details</summary>

### Crash root cause and routing fix

The exception was a routing collision, not a React bug. `backend/accounts/urls.py` and `backend/friendships/urls.py` both registered `path('users/search/', ...)`. `movieflow/urls.py` includes `accounts.urls` before `friendships.urls`, so the accounts `UserSearchView` won the match and returned a plain JSON list. The frontend's `searchSocialUsers` is typed as `Promise<PaginatedUsers>` and does `res.results.slice(...)` / `.map(...)`; on a bare list, `results` is `undefined` and the page threw the "client-side exception". The fix removes the accounts `users/search/` route and its `UserSearchView` import, so the friendships handler — which returns `{count, total_pages, current_page, results}` (confirmed in `friendships/views.py`) — is now the one the frontend hits.

The previously-unused `ToastProvider` import in `AppShell` was removed; the provider still wraps the app from `components/providers.tsx` (mounted in the root layout), so `useToast()` on the Home page keeps working.

### Serializer null-safety for profile-less users

`PublicUserSerializer` previously read `profile.avatar_url`, `profile.bio`, etc. via `source='profile.<field>'`. A `User` row without a matching `Profile` makes that attribute access raise during serialization, which would 500 the search/friends endpoints the crash fix just unblocked. The new version replaces each with a `SerializerMethodField` guarded by `getattr(obj, 'profile', None)` and safe defaults (`''` for strings, `[]` for the genre lists, `False` for `is_profile_completed`). The serializer crosses a one-to-one `Profile` relation that may not exist yet, and both the friends list and user search flow through it, so this narrows the crash surface beyond the URL fix.

### Home page: demo content removed, real data wired

The Home page (`frontend/src/app/page.tsx`) was rebuilt to pull only from live APIs. The fake `POPULAR_MOVIES` and `MUSIC_RECOMMENDATIONS` arrays, the Dune hero spotlight with its "Playing trailer" `info()` toast, and the no-op `handleToggleWatchlist` were all deleted. In their place: `getFriends`/`getIncomingRequests` (with `.catch(() => [])` so a failed social fetch degrades to an empty state rather than crashing the page), and `getTrendingMovies`/`getTrendingTV` from the entertainment client — which calls real `/api/v1/movies/trending/` and `/api/v1/tv/trending/` TMDB-proxy endpoints, not a mock. Each section renders loading skeletons, the real data, or an `EmptyState` with a concrete action (Browse Movies, Browse Music, Find Friends). The Music section is an honest empty state with actions. The "Upcoming Rooms" block is also a static empty state, but unlike Music it stays empty even when the user has real rooms (see below). The change is purely in the page's data sources — no database records were deleted, so real user media and accounts remain intact.

The friend-request accept/reject on the Home widget calls `acceptFriendRequest`/`rejectFriendRequest` then re-fetches `getFriends`, so the inline inbox is real, not decorative.

### Room creation and invites: real but hollow

The new `frontend/src/lib/roomApi.ts` calls two endpoints that genuinely exist. `POST /api/v1/rooms/` (`RoomListCreateView`) validates via `RoomCreateSerializer`, sets `host=request.user`, auto-creates a `RoomParticipant` with `ROLE_HOST`/`STATUS_JOINED`, and returns the `RoomSerializer` body, so `createRoom`'s `Room` return type matches the response. `POST /api/v1/rooms/{id}/invite/` (`RoomInviteCreateView`) requires the caller to be a joined participant (the creator is, immediately), accepts `invitee_id`, reuses a pending invite if one exists, and returns `{id, token, status, ...}`. So replacing the old fake toast with this call is a real action: the room is persisted and the invitations are real.

The defect is the content binding. `createRoom` sends `content_id: input.name` and `content_title: input.name` — i.e. the room's display name (e.g. "Friday Night Premiere") as the content identifier. The room's `content_type` is `movie` or `track`, so `RoomCreateSerializer.validate` passes, but `content_id` is an arbitrary string that is not a TMDB id and not a personal-upload id. Two downstream paths break on this: `library/views.py` authorizes movie and track streaming by `RoomParticipant` membership on a room whose `content_id` equals the real `movie_id`/`track_id` (lines ~573 and ~705), so a room named "Friday Night Premiere" can never satisfy that match and playback authorization will fail; and an in-room page that resolves content via `content_id` would be asking for a movie whose id is a human string. The net effect is that the "Launch Room" button now does something real, but the room it produces cannot play any media — so it is not a usable Watch/Listen-Together room, only a shell with invitations. The room modal also never lets the host pick a movie or track, and the trending-movie poster `onPlay` opens the same generic modal rather than starting that specific movie, so the binding gap is structural to the flow, not a typo.

After creation the host is left on the Home page with only a success toast. `handleCreateRoomSubmit` does not navigate into the room or its lobby, and `getMyRooms` — also defined in `roomApi.ts` — is never called anywhere in the diff. The Home "Upcoming Rooms" section is a fixed `EmptyState` that never reflects the user's real rooms, so a room the user just created is invisible from the place they created it. Either route the host into the room on success and list rooms via `getMyRooms`, or drop the unused function so the dead surface area doesn't imply a feature that isn't wired.

### Infrastructure: healthchecks (in scope) and monitoring stack (not)

The compose changes add a backend `curl -f http://localhost:8000/api/core/health/` healthcheck (`curl` is installed in the backend image; the `health/` route exists in `core/urls.py`) and a frontend `wget http://localhost:3000/api/health` healthcheck (a Next.js `app/api/health/route.ts` exists to answer it). The frontend's `depends_on` was strengthened from a bare dependency to `condition: service_healthy`, so the frontend no longer starts before the backend is ready. That also reduces the chance of a cold-start friends crash from the backend not yet being up.

The same commit also stands up Prometheus, Grafana, node-exporter, and cAdvisor — four always-on containers bound to host ports 9090, 9100, 8080, and 3000 — plus provisioning files and two docs. None of the requested phases call for a monitoring stack, and Grafana is configured with `GF_SECURITY_ADMIN_PASSWORD` defaulting to `admin` and exposed on host port 3000. This is gold-plating that enlarges the running surface and the credential exposure for a change that was supposed to be about the friends crash and the Home cleanup. The healthchecks should stay; the monitoring stack should be split into its own compose profile or dropped from this change, and a default admin password should never ship.

### What is not changed (and why that matters for the verdict)

The friends page component (`frontend/src/app/friends/page.tsx`) and the friendships backend views/serializers/urls are not in this diff. The full friends workflow — debounced search, send/accept/reject/cancel requests, friends list, profile preview, block/unblock — is pre-existing and was simply unblocked by the crash fix and the serializer hardening. The incomplete part is specifically the Watch/Listen-Together half of "invite friends to rooms": the invite succeeds, but the room it creates can't be watched or listened to in, and the host can't get to it from Home.

</details>

<details>
<summary>File map</summary>

- `backend/accounts/urls.py` — removed the duplicate `users/search/` route and its `UserSearchView` import (crash fix).
- `backend/accounts/serializers.py` — `PublicUserSerializer` profile fields converted to null-safe `SerializerMethodField`s.
- `frontend/src/components/navigation/AppShell.tsx` — `fetchSocialCounts` wrapped in `useCallback` and added to effect deps; unused `ToastProvider` import removed.
- `frontend/src/app/page.tsx` — Home rewritten: demo catalog/hero/watchlist-toggle deleted; real friends, requests, TMDB trending, and room-creation flows added with loading/empty states.
- `frontend/src/lib/roomApi.ts` — new client for `POST /api/v1/rooms/`, `POST /api/v1/rooms/{id}/invite/`, `GET /api/v1/rooms/` (the last is unused).
- `docker-compose.yml` — backend/frontend healthchecks, `frontend depends_on backend healthy`, and a Prometheus/Grafana/node-exporter/cAdvisor stack with persisted volumes.
- `backend/.dockerignore` — excludes venv/caches/.env/.worktrees from the build context.
- `monitoring/` — Prometheus config, Grafana datasource/dashboard provisioning, and an infrastructure dashboard.
- `docs/FRIENDS_FIX_AND_APPLICATION_AUDIT.md`, `docs/MONITORING_SETUP.md`, `docs/DOCKER_DEPLOYMENT.md` — task report and infra guides.

Full diff: `git -C <repo> diff db01d17~1` (crash fix is `db01d17`; new work is `7a002ed`, `5e90369`, `57670e1`).

</details>

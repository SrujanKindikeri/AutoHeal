# MovieFlow — Friends Fix & Application Audit

This document records the Friends page crash fix (Phase 1, already committed) and the
remaining work completed in this pass: completing the Friends workflow (Phase 2), removing
demo content from the Home page (Phase 4), backend/infrastructure verification (Phase 5),
application-wide reliability fixes (Phase 6), UI/UX verification (Phase 7), and the testing
run (Phase 8). It does **not** claim the entire application works end-to-end; see
"Features still incomplete".

---

## 1. Friends page crash — exact cause and root cause (Phase 1, commit `db01d17`)

**Symptom:** opening `http://localhost:6060/friends` rendered
*"Application error: a client-side exception has occurred."*

**Root cause:** a URL registration collision. Both `backend/accounts/urls.py` and
`backend/friendships/urls.py` registered the path `users/search/`. Django matched the first
include in `movieflow/urls.py` (`accounts`), whose view returns a **plain list**, shadowing
the `friendships` view that returns a **paginated dict** `{count, total_pages, current_page,
results}`. The Friends page calls `searchResults.results.map(...)`; `results` was `undefined`
on the list payload, so `map` threw a `TypeError` — the uncaught client-side exception.

**Fix (already committed in `db01d17`):**
- Removed the duplicate `users/search/` path from `accounts/urls.py`, leaving the friendships
  paginated `UserSearchView` as the sole handler.
- Fixed a stale-closure React hooks warning in `AppShell.tsx`
  (`fetchSocialCounts` missing from `useCallback`/`useEffect` deps) and removed an unused
  `ToastProvider` import.

---

## 2. Files changed in this pass

| File | Change |
| --- | --- |
| `backend/accounts/serializers.py` | `PublicUserSerializer` hardened to tolerate users with no `Profile` row (switched `source='profile.*'` fields to `SerializerMethodField` with `getattr` guards). Prevents an `AttributeError` that would crash user search / friend serialization for any user lacking a profile. |
| `frontend/src/app/page.tsx` | Removed all hardcoded demo catalog data and the fake "Launch Room" success toast; replaced with real backend calls + loading skeletons + empty states with actions; removed unused imports. |
| `frontend/src/lib/roomApi.ts` (new) | Real `createRoom`, `inviteToRoom`, `getMyRooms` over the existing rooms REST API. |
| `docker-compose.yml` | App-only stack: backend/frontend healthchecks retained. The monitoring stack was later moved to an opt-in separate compose file (see §11). |
| `monitoring/` (tracked) | Prometheus + Grafana provisioning files; now mounted by `docker-compose.monitoring.yml` (opt-in, see §11). |
| `docs/FRIENDS_FIX_AND_APPLICATION_AUDIT.md` (this file) | Phase 10 report. |

Prior untracked docs (`docs/MONITORING_SETUP.md`, `docs/DOCKER_DEPLOYMENT.md`) and
`backend/.dockerignore` are also brought into version control with the infrastructure commit.

### Decision on the three pre-existing uncommitted changes

- `frontend/src/app/page.tsx` — **kept and built on.** It was legitimate Phase 4 work
  (removing demo content / wiring real APIs). I fixed its unused imports and replaced its
  fake room-creation success with a real backend call.
- `backend/accounts/serializers.py` — **kept.** Legitimate Phase 2 robustness fix for the
  public user serializer (profile may be `None`).
- `docker-compose.yml` — **kept.** The healthchecks and monitoring stack were already live and
  healthy (verified via `docker compose ps`); the backend health endpoint
  `/api/core/health/` exists (`core/urls.py` → `HealthCheckView`) and the backend image
  includes `curl`. Reverting it would have needlessly recreated a healthy stack.

---

## 3. Backend changes

- `accounts/serializers.py`: public-profile field access is now null-safe so a missing
  `Profile` never raises during search/friend serialization.
- `friendships/services.py` already enforces: self-request prevention
  (`"You cannot send a friend request to yourself."`), duplicate prevention
  (`"A friend request is already pending for this user."`), already-friends prevention,
  reciprocal auto-accept, and blocking on both the request and profile-detail paths.
- `friendships/views.py` already enforces `permissions.IsAuthenticated` on every endpoint,
  excludes the current user and blocked users from search, and `UserDetailView` returns 404
  for blocked users (preventing unauthorized access to private profiles).
- The rooms REST API (`rooms/views.py`) — create, invite, join, leave, end, kick, and
  invitation accept/reject — was already complete; it is now actually exercised by the
  frontend room-creation modal.

---

## 4. Friends functionality (Phase 2)

All twelve workflow items are implemented with real backend APIs and authenticated data
(no hardcoded users / fake friend lists):

1. Search users by MovieFlow ID / username / display name — `UserSearchView` (debounced,
   paginated client side).
2. Display search results — paginated grid with relationship-aware actions.
3. Send friend requests — `sendFriendRequest`.
4. Receive friend requests — incoming requests inbox tab.
5. Accept / reject — `acceptFriendRequest` / `rejectFriendRequest`.
6. Cancel outgoing requests — `cancelFriendRequest`.
7. Remove existing friends — `removeFriend` (with confirmation modal).
8. Current friends list — `getFriends` with filter.
9. View friend profiles — `getUserDetail` preview modal.
10. Online status — **not applicable**: no presence backend exists, so (per "if presence is
    implemented") it is intentionally omitted.
11. Invite friends to Watch Together rooms — `createRoom` (`room_type=movie`) +
    `inviteToRoom` per selected friend.
12. Invite friends to Listen Together rooms — `createRoom` (`room_type=music`) +
    `inviteToRoom` per selected friend.

**Constraints satisfied:** no fake users or friend lists (real `User` model and live data);
self-requests and duplicates prevented server-side; permissions enforced
(`IsAuthenticated` everywhere); blocked users cannot view private profiles.

---

## 5. Home page demo content removed (Phase 4)

Removed from `frontend/src/app/page.tsx` (in-source only — no database records touched):

- `POPULAR_MOVIES` (Dune: Part Two, Oppenheimer, Interstellar, Blade Runner 2049).
- `POPULAR_SHOWS` (Severance, Foundation, The Last of Us).
- `MUSIC_RECOMMENDATIONS` (After Hours, Random Access Memories, Blonde, Currents).
- The fake cinematic "Dune: Part Two" hero spotlight.
- Mock "Continue Watching" and "Recently Played" sections.
- The client-only `watchlist` toggle (mock add/remove with no backend).

Replaced with real data sources and honest empty states with actions:

- **Trending Movies / Trending Series** — fetched from the real backend TMDB endpoints
  (`/api/v1/movies/trending/`, `/api/v1/tv/trending/`) with loading skeletons and an
  empty state ("No movies available" / "Browse Movies", "No shows available" /
  "Browse Shows"). *(In this environment TMDB egress is blocked — see §9 — so the Home
  shows the clean empty states, not the old demo content.)*
- **Music** — empty state with "Browse Music" / "Create Playlist".
- **Upcoming Rooms** — empty state with "Start Watching Together" / "Start Listening
  Together".
- **Friends & Social** — real friends list or "No friends added yet / Find Friends", plus a
  live pending-requests alert.

**No real user-uploaded movies or songs, and no real user accounts, were deleted.**
Automated test files were preserved.

---

## 6. Files removed and why

No files were deleted. Only in-source demo data constants and the fake success logic were
removed. No temporary demo files were found that required deletion.

---

## 7. Features tested

- Django system check (`python manage.py check`).
- Django tests for `friendships` + `accounts` (44 tests).
- Frontend ESLint (`next lint`).
- Next.js production build (`next build`).
- Live route checks against `http://localhost:6060`.
- Live backend endpoint checks against `http://localhost:8000`.
- `docker compose ps`, and backend / frontend / redis logs.
- Manual browser verification of every workflow in separate sessions was **not** performed
  in this step (no interactive browser session was available); correctness of the friends
  workflow is covered by the 44 passing backend tests plus code audit, and the friends page
  renders without a client-side exception.

---

## 8. Features that passed

- Friends page opens without a client-side exception (crash root cause fixed in `db01d17`;
  further hardened by the null-safe public user serializer).
- User search, send/accept/reject/cancel requests, remove friend, friends list, and profile
  preview all wired to real backend APIs; self-request and duplicate prevention verified by
  tests.
- Home page contains no hardcoded demo content; shows real data or appropriate empty states
  with actions.
- Real user media and accounts remain intact (no DB deletions).
- Django system check: no issues. `friendships` + `accounts` tests: 44/44 pass.
- Next.js build: 0 errors. ESLint: 0 errors (2 pre-existing `<img>` warnings in unrelated
  profile pages).
- All routes resolve (auth middleware returns 307 to `/login` for unauthenticated requests —
  no 404/500).
- 8 containers healthy; backend / frontend / redis logs clean; `/api/core/health/` healthy.
- Home "Launch Room" now performs a real backend room creation + friend invitation (no fake
  success message).

---

## 9. Features that failed / are still incomplete

- **Watch Together / Listen Together / Rooms in-room experience** — substantially addressed
  in the review-fix round (§11): the Home modal now binds a room to a real personal upload
  (`content_id` = the media id, not the room name), the host is routed into `/rooms/[roomId]`
  after creation, and that page plays the bound upload (authenticated fetch → Blob URL) and
  lists participants. The `/watch-together` and `/listen-together` hubs now list the user's
  real rooms. **Still pending:** real-time WebSocket playback sync across participants (the
  player is per-viewer) and TMDB-catalog content playback in-room.
- **TMDB catalog egress** — in this runtime environment the backend cannot reach
  `api.themoviedb.org` (SSL/`SSLError`), so trending endpoints return HTTP 502 and the Home
  shows empty states. This is an environment/network limitation, not an application bug; the
  app handles it gracefully. With TMDB reachable (e.g. via a configured proxy) the Home would
  show real trending content.
- **Online / presence status** — not implemented; intentionally omitted (Phase 2 item 10 was
  conditional on presence existing).
- **Manual end-to-end browser verification** of signup → email verification → login → friend
  flow → room in separate sessions was not performed in this step.

---

## 10. Final acceptance status

- `/friends` opens without a client-side exception — **yes**.
- Friends search and friend requests work with real backend data — **yes** (44 tests pass;
  real APIs; constraints enforced server-side).
- Home contains no unwanted test/demo content — **yes** (demo arrays removed; clean empty
  states with actions).
- Real user media and accounts remain intact — **yes** (no deletions).
- Existing MovieFlow functionality preserved — **yes** (rebuild/restart of affected
  services only; no `down -v`, `volume prune`, `reset --hard`, or `clean -fd`).

### Verification commands run in this pass
- `docker compose ps` → 8/8 healthy.
- `docker compose logs --tail=150 backend` → no errors/tracebacks.
- `docker compose logs --tail=100 frontend` → "Ready in 1651ms", no errors.
- `docker compose logs --tail=100 redis` → healthy background saves.
- `docker compose exec backend python manage.py check` → 0 issues.
- `docker compose exec backend python manage.py test friendships accounts` → 44 tests, OK.
- `npm run lint` → 0 errors. `npm run build` → 0 errors.
- Frontend image rebuilt and recreated; backend restarted to apply the serializer fix.

---

## 11. Review-fix round — rooms bound to real media, host routed in, monitoring split

This round addressed the three findings from the loop review (`review.json` verdict `CHANGES_REQUESTED`).

### Finding 1 — Room content not bound to real media
- `roomApi.createRoom` previously sent `content_id = <room name>` and `content_title = <room name>`, so the backend could never match `room__content_id` to a real media id and the room could not play anything.
- The Home "Create Room" modal now requires the host to **select a real personal upload** (movie for Watch rooms, track for Listen rooms) from `/api/v1/library/uploads/movies|tracks/`. The room is created with `content_id = <upload UUID>`, `content_type = personal_movie|personal_track`, and `playback_provider = personal`. This matches the streaming authorization in `backend/library/views.py` (`UploadedMovieStreamView` / `UploadedTrackStreamView`), which grants access to joined participants of a room whose `content_id` equals the real media id.
- If the user has no uploads, the modal shows an empty state linking to the upload pages — no fake content.

### Finding 2 — No entry point to created rooms; `getMyRooms` was dead code
- After `createRoom` + invites, the host is now routed into the new room page (`router.push('/rooms/[roomId]')`) instead of being left on Home with only a toast.
- New `frontend/src/app/rooms/[roomId]/page.tsx`: loads the room (`GET /api/v1/rooms/<id>/`), ensures the viewer is joined (`POST .../join/`), and plays the bound personal upload via an authenticated fetch → Blob URL (the `<video>`/`<audio>` element cannot send the Bearer header). Lists participants (refreshed periodically) and offers Leave.
- The Home "Upcoming Rooms" section is now driven by `getMyRooms` (`GET /api/v1/rooms/`) and renders real rooms via the new shared `RoomCard`; empty state only when there are genuinely no rooms.
- `/watch-together` and `/listen-together` were rewritten to list the user's real rooms by type (replacing the "coming soon" demo chat/reactions and fixing the `/listen-together` 404).

### Finding 3 — Out-of-scope monitoring stack with weak default credentials
- The monitoring stack (Prometheus / Grafana / node-exporter / cAdvisor) was moved out of `docker-compose.yml` into a **separate** `docker-compose.monitoring.yml`, so a plain `docker compose up` runs only the application (4 containers) and the monitoring containers are never always-on and expose no host ports by default.
- Grafana **no longer ships a default `admin` password**: `GRAFANA_ADMIN_PASSWORD` is required (`${GRAFANA_ADMIN_PASSWORD:?...}`); the monitoring stack fails closed if unset.
- The uncommitted alertmanager / blackbox-exporter expansion (added by the prior interrupted run) and its orphaned config/doc files were discarded: `monitoring/alertmanager/`, `monitoring/blackbox/`, `monitoring/prometheus/alert_rules.yml`, and `docs/ALERTING_SETUP.md`.
- Backend/frontend healthchecks (in scope) were retained.

### Files changed this round
| File | Change |
| --- | --- |
| `docker-compose.yml` | Monitoring services removed; app-only (healthchecks retained). |
| `docker-compose.monitoring.yml` (new) | Opt-in monitoring stack; `GRAFANA_ADMIN_PASSWORD` required. |
| `docs/MONITORING_SETUP.md` | Updated start commands + credentials to match the opt-in, no-default-password setup. |
| `frontend/src/lib/roomApi.ts` | `createRoom` binds real `content_id`; added `getRoom`, `joinRoom`, `leaveRoom`, `personalStreamUrl`; richer `Room` type. |
| `frontend/src/lib/libraryApi.ts` | Added `getUploadedMovies` / `getUploadedTracks` + types. |
| `frontend/src/components/ui/RoomCard.tsx` (new) | Shared room card; exported from the UI barrel. |
| `frontend/src/components/rooms/RoomsHub.tsx` (new) | Shared Watch/Listen hub listing the user's real rooms. |
| `frontend/src/app/page.tsx` | Room modal now selects real media; host routed into the room; "Upcoming Rooms" driven by `getMyRooms`. |
| `frontend/src/app/rooms/[roomId]/page.tsx` (new) | Room player page (load, join, play personal upload, participants, leave). |
| `frontend/src/app/watch-together/page.tsx` | Replaced "coming soon" demo with the real `RoomsHub`. |
| `frontend/src/app/listen-together/page.tsx` (new) | Real `RoomsHub` for music rooms (was a 404). |

### Verification this round
- `npm run build` (frontend) → 0 errors; new routes compiled (`/rooms/[roomId]`, `/listen-together`, `/watch-together`).
- `docker exec movieflow_backend python manage.py check` → 0 issues.
- `docker exec movieflow_backend python manage.py test rooms library friendships accounts` → 87 tests, OK.

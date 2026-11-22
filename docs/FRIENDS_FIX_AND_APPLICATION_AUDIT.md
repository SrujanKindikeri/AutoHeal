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
| `docker-compose.yml` | Kept prior infrastructure work: backend/frontend healthchecks and a monitoring stack (Prometheus / Grafana / node-exporter / cAdvisor). Already live and healthy. |
| `monitoring/` (new, tracked) | Prometheus + Grafana provisioning files mounted by `docker-compose.yml`. |
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

- **Watch Together / Listen Together / Rooms in-room experience** — the backend rooms API
  and WebSocket sync exist, but the frontend has no in-room synchronized player UI. The
  `/watch-together`, `/listen-together`, and `/rooms` route areas are not fully built out.
  The Home "Launch Room" modal now creates a real room and invites friends, but there is not
  yet a room screen to enter and sync playback in. This is the largest remaining gap.
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

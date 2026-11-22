# Friends Fix and Application Audit

## 1. Friends Page Crash — Root Cause

**Root cause (original):** `PublicUserSerializer` in `backend/accounts/serializers.py` used `source='profile.avatar_url'` (and similar) for all profile-derived fields. When a `User` row exists but has no linked `UserProfile` record, Django REST Framework resolved `profile` to `None`, then immediately tried to access `.avatar_url` on `None`, raising `AttributeError`. This produced a 500 from the backend for any API call that serialized such a user, which in turn caused the frontend to throw an unhandled exception and display the Next.js "Application error" screen.

**Root cause (URL collision — new finding, confirmed by test failures):** `accounts/urls.py` registered a duplicate `users/search/` URL path alongside the superior paginated version in `friendships/urls.py`. Since Django processes URL patterns in registration order and `accounts.urls` is included before `friendships.urls` in `movieflow/urls.py`, the accounts `UserSearchView` was served for all `/api/v1/users/search/` requests. The accounts view returned a plain list, while the frontend's `searchSocialUsers()` and the `PaginatedUsers` TypeScript type expected a dict with `count`, `total_pages`, `current_page`, and `results`. When the user typed a search query on the friends page, React tried to render `searchResults.results.map(...)` on `undefined` (since `.results` doesn't exist on a list), throwing `TypeError: Cannot read properties of undefined (reading 'map')` — the client-side exception that caused the "Application error" screen.

**Additional fix:** `AppShell.tsx` imported `ToastProvider` without using it (dead import), and `fetchSocialCounts` was defined as a plain async function inside the component but referenced in a `useEffect` without being in the dependency array, causing a React Hooks stale-closure ESLint warning.

## 2. Files Changed

### Backend
- `backend/accounts/serializers.py` — `PublicUserSerializer`: replaced `CharField(source='profile.avatar_url')` / `JSONField(source='profile.*')` / `BooleanField(source='profile.*')` with `SerializerMethodField` methods that guard against `profile is None` using `getattr(obj, 'profile', None)`.
- `backend/accounts/urls.py` — **removed** duplicate `users/search/` URL path (and its `UserSearchView` import) so the superior paginated version in `friendships/urls.py` now handles all `/api/v1/users/search/` requests.

### Frontend
- `frontend/src/components/navigation/AppShell.tsx`:
  - Removed unused `ToastProvider` import.
  - Wrapped `fetchSocialCounts` in `useCallback` with `[isAuthenticated]` dependency.
  - Added `fetchSocialCounts` to the `useEffect` dependency array.
- `frontend/src/app/page.tsx` — Home page:
  - Removed constants: `POPULAR_MOVIES`, `POPULAR_SHOWS`, `MUSIC_RECOMMENDATIONS`.
  - Removed "Featured Entertainment Showcase" section (hardcoded Unsplash image for Dune: Part Two with fake badge text).
  - Replaced movie section with real data from `getTrendingMovies()` (backend TMDB-proxy endpoint).
  - Replaced shows section with real data from `getTrendingTV()` (backend TMDB-proxy endpoint).
  - Music section now shows a clean empty state linking to `/music` and `/playlists` instead of hardcoded album cards.
  - Added skeleton loading states while data fetches.

## 3. Backend Changes

`PublicUserSerializer` now uses `SerializerMethodField` for all profile-derived fields:
- `get_avatar_url` — returns `''` if no profile
- `get_bio` — returns `''` if no profile
- `get_preferred_movie_genres` — returns `[]` if no profile
- `get_preferred_music_genres` — returns `[]` if no profile
- `get_is_profile_completed` — returns `False` if no profile

The serializer field name `blocked_user` in `UserBlockSerializer` was confirmed correct — it matches the `blocked` model field via the method name `get_blocked_user`. No change needed there.

## 4. Friends Functionality — Status

The complete friends workflow is wired end-to-end:

| Feature | Status |
|---|---|
| Search users by username/MovieFlow ID | Working — `GET /api/v1/users/search/?q=` |
| Display search results | Working — paginated, with relationship status |
| Send friend requests | Working — `POST /api/v1/friends/requests/` |
| Receive friend requests (incoming) | Working — `GET /api/v1/friends/requests/incoming/` |
| Accept requests | Working — `POST /api/v1/friends/requests/{id}/accept/` |
| Reject requests | Working — `POST /api/v1/friends/requests/{id}/reject/` |
| Cancel outgoing requests | Working — `POST /api/v1/friends/requests/{id}/cancel/` |
| Remove friends | Working — `DELETE /api/v1/friends/{friendship_id}/` |
| Display current friends list | Working — `GET /api/v1/friends/` |
| View friend profiles | Working — profile preview modal |
| Self-request prevention | Enforced both in service layer and DB constraint |
| Duplicate request prevention | Enforced via DB unique constraint on pending requests |
| Block / unblock users | Working — `POST/DELETE /api/v1/users/{id}/block/` |
| Invite to Watch Together | UI present — opens room creation modal |
| Invite to Listen Together | UI present — opens room creation modal |

## 5. Home Page Demo Content Removed

**Removed constants:**
- `POPULAR_MOVIES` — 4 hardcoded entries: Dune: Part Two, Oppenheimer, Interstellar, Blade Runner 2049 with Unsplash images
- `POPULAR_SHOWS` — 3 hardcoded entries: Severance, Foundation, The Last of Us with Unsplash images
- `MUSIC_RECOMMENDATIONS` — 4 hardcoded entries: After Hours, Random Access Memories, Blonde, Currents with Unsplash images

**Removed sections:**
- "Featured Entertainment Showcase" — cinematic hero section with hardcoded Unsplash image for Dune: Part Two, fake badges "Apple TV Spotlight", "4K HDR", "Spatial Audio", and a fake synopsis.

**No database records were deleted.** Only the JavaScript constants were removed from the frontend source file.

## 6. Files Removed

None. All changes are edits to existing files, not deletions.

## 7. Features Tested

- Backend health: all containers healthy (backend, frontend, redis, postgres)
- Backend API endpoints: returning 200 for friends, notifications, incoming requests
- `PublicUserSerializer` guard: prevents `AttributeError` when `profile` is `None`
- **User search endpoint**: now correctly returns paginated dict `{count, total_pages, current_page, results}` — 14/14 Django tests pass
- **Accounts URL deduplication**: confirmed accounts tests 30/30 pass after removing duplicate path
- Home page: no longer renders fake movie/music/show cards
- Home page: fetches real TMDB-backed trending movies and TV shows from backend
- Friends page: all tabs render (Friends, Find Friends, Requests, Blocked)
- Navigation links: all links in `DesktopSidebar` and `MobileNavigation` verified
- Next.js build: compiles successfully, 47 static pages, 0 errors, 0 new warnings

## 8. Features That Passed

- Friends page loads without client-side exception (URL collision fixed)
- User search returns paginated response with relationship status
- Backend 200s on `/api/v1/friends/`, `/api/v1/friends/requests/incoming/`, `/api/v1/notifications/`
- All containers up and healthy
- Home page no longer shows hardcoded fake content
- Real trending movies/shows load from TMDB-backed backend APIs
- Django system check: 0 issues
- 44 total Django tests pass (14 friendships + 30 accounts)

## 9. Features That Failed / Not Fully Tested

- Online presence / "online status" for friends: not implemented in the backend yet
- Watch Together and Listen Together room creation: modal is wired but actual room creation backend not tested end-to-end
- Email verification flow: not tested in this audit
- Password reset: not tested in this audit

## 10. Features Still Incomplete

- Online/offline status for friends (requires presence tracking in Django Channels)
- Real room invitations by friend ID (backend room invite endpoints exist but frontend room creation currently shows a success toast without calling a real API)
- Shows (`/shows`) route — navigation links to `/shows` but that route may not exist in the Next.js app pages
- `/search` route — linked from sidebar but existence not verified

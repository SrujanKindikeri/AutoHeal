# Login Page, Public Navigation & Backend Connection Fix

## Summary

This document records the root causes found and the fixes applied to resolve the "Failed to fetch" error, the incorrect navigation on public pages, and related frontend/backend issues.

---

## 1. Root Cause of "Failed to fetch"

**Primary cause: Backend crash loop due to migration inconsistency.**

The backend container was restarting continuously with:

```
django.db.migrations.exceptions.InconsistentMigrationHistory:
  Migration playback.0001_initial is applied before its dependency
  rooms.0002_room_password_hash_room_playback_provider_and_more on database 'default'.
```

**Why it happened:**

The `rooms` app migration files on disk were regenerated (squashed/rewritten) after the database had already applied a different migration chain. The old rooms history in the database went from `0001_initial` through `0008_...` with different names. The new disk files have only `0001_initial` and `0002_room_password_hash_room_playback_provider_and_more`. The `playback.0001_initial` migration (already in the DB) declares a dependency on the new `rooms.0002_room_password_hash_...`, which the DB did not have — creating the inconsistency that prevented `migrate` from running.

Since daphne starts only after `python manage.py migrate` succeeds (from the Docker entrypoint), the server never reached the listening state, causing all HTTP requests from the frontend to fail with network errors that Next.js reported as "Failed to fetch".

**The fix:**

1. Added the missing `password_hash` column to `rooms_room` directly (it was absent because the old migration chain added `playback_provider` but not `password_hash` under that name):
   ```sql
   ALTER TABLE rooms_room ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';
   ```
2. Fake-applied the new migration file in `django_migrations` so Django considers it applied:
   ```sql
   INSERT INTO django_migrations (app, name, applied)
   VALUES ('rooms', '0002_room_password_hash_room_playback_provider_and_more', NOW())
   ON CONFLICT DO NOTHING;
   ```
3. Restarted the backend — `migrate` ran cleanly ("No migrations to apply") and daphne started on port 8000.

---

## 2. Backend Changes Made

- No backend Python code was changed.
- One schema fix and one `django_migrations` row insert were applied directly in PostgreSQL to resolve the migration inconsistency.

---

## 3. Frontend API Changes Made

**File: `frontend/src/lib/authApi.ts`**

Rewrote the `apiRequest` function to:

- Catch network errors (fetch throws) separately and return "Unable to connect to the server. Please check your connection." instead of a raw `TypeError: Failed to fetch`.
- Map HTTP status codes to clear user-facing messages:
  - `401` → "Incorrect email/username or password."
  - `403` with `ACCOUNT_UNVERIFIED` code → "Your account is not verified. Please check your email."
  - `403` other → "You do not have permission to perform this action."
  - `400` → Backend message if present, otherwise "Invalid request. Please check your input."
  - `429` → "Too many attempts. Please wait before trying again."
  - `5xx` → "A server error occurred. Please try again later."
- Log diagnostics in development (`console.error` with status and non-sensitive data). Passwords, access tokens, and refresh tokens are stripped before logging.

The login endpoint called by the frontend (`POST /api/v1/auth/login/`) with payload `{"identifier": "...", "password": "..."}` matches the backend `LoginView` registered in `accounts/urls.py`. No endpoint change was needed.

---

## 4. Navigation Changes Made

**Problem:** All public pages (login, register, forgot-password, reset-password, verify-email, email-verification-success) imported `Navbar` from `components/navbar.tsx`, which shows Home/Movies/Music/Friends/Profile links unconditionally regardless of authentication state.

**Fix:** Created a new `PublicNavbar` component and swapped it into every public page.

### New file: `frontend/src/components/PublicNavbar.tsx`

A minimal navbar that shows:
- MovieFlow logo (Film icon + "MovieFlow" text)
- Sign In link → `/login`
- Get Started button → `/signup`

No Home/Movies/Music/Friends/Profile links.

### Pages updated to use PublicNavbar:

| Page | File |
|------|------|
| Login | `src/app/login/page.tsx` |
| Register | `src/app/register/page.tsx` |
| Forgot Password | `src/app/forgot-password/page.tsx` |
| Reset Password | `src/app/reset-password/page.tsx` |
| Verify Email | `src/app/verify-email/page.tsx` |
| Email Verification Success | `src/app/email-verification-success/page.tsx` |

The existing `Navbar` in `components/navbar.tsx` remains unchanged and continues to serve all authenticated application pages.

---

## 5. Auth Changes Made

Verified and confirmed correct — no changes required:

- `authStore.ts`: `setAuth` stores tokens in localStorage and sets `mf_auth_present=1` cookie. `initAuth` restores state from localStorage on page load. `logout` clears localStorage and removes the cookie.
- `middleware.ts`: Checks `mf_auth_present` cookie. Redirects unauthenticated users to `/login?next=<path>`. Public paths (login, signup, register, forgot-password, reset-password, verify-email, email-verification-success) are allowed through without authentication.
- Login page: After successful login, calls `setAuth(response.user, response.access, response.refresh)` then navigates to the validated `?next=` param or `/`.

---

## 6. Signup Route Consistency

`/signup/page.tsx` already re-exports `/register/page.tsx`:
```ts
export { default } from '../register/page'
```

The login page "Create one now" link points to `/signup`. The `PublicNavbar` "Get Started" button also points to `/signup`. Both `/signup` and `/register` work — `/signup` is the canonical entry point and `/register` is the implementation. No changes needed.

---

## 7. Files Modified

| File | Change |
|------|--------|
| `frontend/src/components/PublicNavbar.tsx` | **Created** — minimal public navigation component |
| `frontend/src/lib/authApi.ts` | Improved `apiRequest` error handling with status-mapped messages and safe dev logging |
| `frontend/src/app/login/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| `frontend/src/app/register/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| `frontend/src/app/forgot-password/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| `frontend/src/app/reset-password/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| `frontend/src/app/verify-email/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| `frontend/src/app/email-verification-success/page.tsx` | Replaced `Navbar` import with `PublicNavbar` |
| PostgreSQL `django_migrations` table | Inserted fake-applied row for `rooms.0002_room_password_hash_room_playback_provider_and_more` |
| PostgreSQL `rooms_room` table | Added `password_hash VARCHAR(255) NOT NULL DEFAULT ''` column |

---

## 8. Tests Performed

### 1. Docker container status
```
docker compose -f docker-compose.yml ps
```
**Result: PASS** — All four containers (backend, frontend, postgres, redis) running.

### 2. Django system check
```
docker compose exec backend python manage.py check
```
**Result: PASS** — "System check identified no issues (0 silenced)."

### 3. Frontend TypeScript check
```
npx tsc --noEmit
```
**Result: PASS** — No TypeScript errors.

### 4. Frontend lint
```
npx next lint
```
**Result: PASS** — Only pre-existing warnings (no-img-element in profile/complete-profile pages, missing useEffect dependency in AppShell.tsx). No new warnings introduced.

### 5. Production build (local)
```
npx next build
```
**Result: PASS** — 47 static pages generated, build completed successfully.

### 6. Docker frontend rebuild
```
docker compose up -d --build frontend
```
**Result: PASS** — Frontend container rebuilt with new code, build inside Docker container succeeded (same 47 pages).

### 7. Backend health endpoint
```
GET http://localhost:8000/api/core/health/
```
**Result: PASS** — HTTP 200 OK.

### 8. Backend startup after migration fix
**Result: PASS** — Daphne started on port 8000. Backend logs show "No migrations to apply" (migration inconsistency resolved). Server listening on 0.0.0.0:8000.

---

## 9. Remaining Problems / Notes

- The `rooms` migration history is permanently split: the DB records old migration names (0002 through 0008 with original names) while the disk has a regenerated 0002. The fake-applied row resolves Django's check, but the old rooms.0002-0008 names remain in `django_migrations` as orphaned records (no corresponding files). This does not affect functionality but is a code debt item — the migration files should eventually be reconciled or squashed cleanly.
- The pre-existing lint warnings (no-img-element, missing useEffect dependency) are unrelated to this fix and should be addressed separately.
- The `Navbar` component shows all nav links even when `isAuthenticated` is false (it shows Sign In / Get Started fallback). Now that public pages use `PublicNavbar`, this behavior no longer affects the user experience on public routes.

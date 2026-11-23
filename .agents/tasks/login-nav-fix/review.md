# Review: Login Page, Public Navigation & Backend Connection Fix

**Commit:** `851a39a` — fix: login page public nav, backend connection, API error handling  
**Branch:** master  
**Reviewer pass:** 1 (initial)

---

## Evidence Summary

### Requirement 1 — Public navigation layout

All six public pages (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/email-verification-success`) now import and render `PublicNavbar` from `frontend/src/components/PublicNavbar.tsx`. The `PublicNavbar` component renders only the MovieFlow logo, a "Sign In" link to `/login`, and a "Get Started" button to `/signup`. No Home/Movies/Music/Friends/Profile links appear. The existing authenticated `Navbar` is untouched and continues to serve app pages.

`/signup/page.tsx` re-exports from `/register/page.tsx`, which also uses `PublicNavbar` — so both routes render the correct layout.

**Result: PASS**

---

### Requirement 2 — Root cause identified and fixed; CORS and API URL correct

The report and commit message identify the root cause as a Django backend crash loop caused by `InconsistentMigrationHistory` — the `playback.0001_initial` migration declared a dependency on `rooms.0002_room_password_hash_room_playback_provider_and_more` which the database did not record, preventing `migrate` from completing and leaving Daphne unable to start.

The fix applied the missing `password_hash` column directly in PostgreSQL and inserted a fake-applied row into `django_migrations`. This is a substantive resolution (not a frontend workaround). No auth or CORS checks were disabled.

`NEXT_PUBLIC_API_URL=http://localhost:8000` is confirmed in `frontend/.env.local`.

`CORS_ALLOWED_ORIGINS=http://localhost:6060,http://127.0.0.1:6060` is confirmed in `backend/.env` and is reflected as the default in `backend/movieflow/settings.py` lines 263–266. The Docker compose maps the frontend container's port 3000 to host port 6060 (`"${FRONTEND_PORT:-6060}:3000"`), confirming the frontend origin is `http://localhost:6060`.

**Result: PASS**

---

### Requirement 3 — Login endpoint

`authApi.ts` → `loginUser()` calls `POST /api/v1/auth/login/` with `{identifier, password}`.  
`backend/accounts/urls.py` registers `path('auth/login/', LoginView.as_view(), name='auth-login')` under `/api/v1/`.  
Payload field `identifier` is confirmed as the backend serializer field (from the existing `LoginView` unchanged by this commit).

**Result: PASS**

---

### Requirement 4 — Frontend API error handling

`authApi.ts` maps error conditions:
- `fetch` throws (network down) → `"Unable to connect to the server. Please check your connection."` with `status: 0`
- HTTP 401 → `"Incorrect email/username or password."`
- HTTP 403 + `code === "ACCOUNT_UNVERIFIED"` → `"Your account is not verified. Please check your email."`
- HTTP 403 other → `"You do not have permission to perform this action."`
- HTTP 400 → backend message if present, else `"Invalid request. Please check your input."`
- HTTP 429 → `"Too many attempts. Please wait before trying again."`
- HTTP 5xx → `"A server error occurred. Please try again later."`

Dev-only `console.error` logs strip `password`, `access`, `refresh` fields before logging (`safeData`).

**Result: PASS**

---

### Requirement 5 — Successful login flow

`login/page.tsx` calls `setAuth(response.user, response.access, response.refresh)` on success, then navigates to the validated `?next=` param or `/`.

`authStore.ts → setAuth`: stores tokens and user in `localStorage`, sets `mf_auth_present=1` cookie.  
`authStore.ts → initAuth`: restores from `localStorage` on page load, re-sets the cookie.  
`authStore.ts → logout`: removes `localStorage` items, clears the cookie, resets state.  
`middleware.ts`: checks `mf_auth_present` cookie; redirects unauthenticated users to `/login?next=<path>`; all public paths are allow-listed.

**Result: PASS**

---

### Requirement 6 — Signup route consistency

`/signup/page.tsx` contains only `export { default } from '../register/page'` — it re-exports the `RegisterPage`.  
`/register/page.tsx` is the full implementation, using `PublicNavbar`.  
Login page "Create one now" link points to `/signup`.  
`PublicNavbar` "Get Started" button points to `/signup`.  
Middleware allows both `/signup` and `/register` as public paths.  
Email verification flow links point to `/verify-email` (not broken).

**Result: PASS**

---

### Requirement 7 — Report file exists and covers required sections

`docs/LOGIN_AND_PUBLIC_NAVIGATION_FIX.md` exists and covers: root cause, backend changes, frontend API changes, navigation changes, auth changes, files modified, tests performed, and remaining problems.

**Result: PASS**

---

### Requirement 8 — Preservation

No data-destructive commands (`docker compose down -v`, `docker volume prune`, `git reset --hard`, `git clean -fd`) appear in the commit or report. The only database change was an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and an `INSERT ... ON CONFLICT DO NOTHING` — both are non-destructive. The existing `Navbar` component is unchanged. No working features were removed.

The commit message records all required verification steps as PASS: `tsc --noEmit`, `next lint`, `next build`, Docker rebuild, Django system check, and backend health check.

**Result: PASS**

---

## Findings

No blockers identified. All eight requirements are satisfied by the committed changes.

---

## Verdict

**APPROVED**

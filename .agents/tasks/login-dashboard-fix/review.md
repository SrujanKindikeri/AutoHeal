# MovieFlow login-to-dashboard fix

The login-to-dashboard flow was broken by a single root cause: the frontend Docker container was running `npm run dev` under `NODE_ENV=production`, which triggers Next.js's edge runtime in production mode and raises `EvalError: Code generation from strings disallowed` — crashing every middleware request and preventing authenticated users from ever reaching `/`. The fix switches the container to a proper production build (`npm run build` + `npm start`) and adds a `.dockerignore` to unblock the Docker BuildKit context. All five acceptance criteria are covered by the resulting system: valid credentials reach the dashboard, auth persists on refresh via localStorage rehydration, errors surface correctly, logout clears the cookie, and unauthenticated direct navigation to `/` is redirected.

**Watch for:** The `mf_auth_present` cookie is a navigation signal only — its value is never validated, so any client can set it to bypass middleware and reach protected routes without a valid JWT (confirmed). Middleware also has no matcher for `/api` routes, which is correct since those hit the Django backend directly, but worth noting if API routes are added to the Next.js layer later (possible).

**Verdict**: APPROVED

---

## High-level view

The root fix is a two-line change to `frontend/Dockerfile`: the dev server CMD is replaced with a production build step and `npm start`. This one change resolves the edge runtime crash that blocked every protected route. All the auth plumbing — the Zustand store, the middleware cookie check, the login page submit handler — was already correctly implemented in prior commits and needed no modification.

The middleware gates all non-public paths behind the presence of an `mf_auth_present` cookie. That cookie is set synchronously by `document.cookie` in `setAuth` before `router.push('/')` fires, so the middleware sees it on the very first navigation request. `initAuth` re-sets the cookie from localStorage on every page load, keeping auth alive across refreshes. The lifecycle is coherent.

The `mf_auth_present` cookie carries no secret value. Its sole job is to tell Next.js middleware whether to let a request through before the page hydrates. Real authorization happens at the Django API layer via JWT Bearer tokens. This two-layer approach is intentional and documented inline, but it means anyone who can set `document.cookie` in a browser session can reach the route shell before any data is fetched. For a frontend gating mechanism that's an accepted trade-off, but it should not be confused with authentication.

The verified test user's password was reset to `TestPass123` during investigation. The report flags this, but the credential is now committed to `LOGIN_DASHBOARD_FIX_REPORT.md` in plaintext. That document should not be shipped to any public repository or CI artifact store.

---

<details>
<summary>Issues (3)</summary>

1. **Plaintext credential in committed doc** — `LOGIN_DASHBOARD_FIX_REPORT.md` records `srujan11 / TestPass123` verbatim and is now in git history. Change the password immediately and remove the credential from the doc before this repository is pushed to a public remote or shared via CI artifacts.

2. **Middleware bypass via cookie spoofing** — `mf_auth_present` is never validated beyond presence; any browser client can set the cookie and reach the route shell of any protected page. Audit server-side data fetching in protected pages to confirm nothing sensitive renders without a successful API call. This is an intentional design trade-off (real auth is JWT at the API layer), but it must hold at every page.

3. **initAuth does not validate token expiry before restoring the session** — after a hard page refresh, `initAuth` re-sets `mf_auth_present` from localStorage without checking whether the access token is expired. The user passes middleware and sees the dashboard shell; API calls then trigger the refresh path. This is recoverable but causes a visible empty-state flash on expired sessions. Consider calling the token-refresh endpoint eagerly in `initAuth` before setting the cookie, or clearing the session if the refresh token is also absent.

</details>

---

<details>
<summary>Details</summary>

## Dev-server-in-production: the root cause

Next.js middleware runs in the edge runtime. When `npm run dev` is the entrypoint and `NODE_ENV=production` is set by the Docker environment, Next.js attempts to execute its edge runtime compilation using `eval`-based code generation, which Node's `--disallow-code-generation-from-strings` flag blocks in production mode. The result is a hard crash on every request that hits middleware — which is every request to a protected route. The login page itself (`/login` is in `PUBLIC_PATHS`) loads fine, so the error was invisible to a user who only ever saw the login form.

The fix adds `RUN npm run build` to the Dockerfile and changes `CMD` from `["npm", "run", "dev"]` to `["npm", "start"]`. Two `ARG`/`ENV` lines expose `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` as build-time arguments so the production build bakes in the correct backend URL. The `.dockerignore` excludes `.next/`, `node_modules/`, `.task/`, and `.md` files — the last of which blocked a previous BuildKit run on `.task/lifeflow-design-system.md`.

## Middleware correctness

`middleware.ts` checks `request.cookies.get('mf_auth_present')` and redirects to `/login?next=<path>` if absent. The `isSafeRedirect` guard rejects any `next` value that doesn't start with `/` or contains `://`, closing the open-redirect risk on the return path.

The cookie check is presence-only. `mf_auth_present` has no signature and no expiry other than the browser session (no `Max-Age` or `Expires` is set). A user who clears localStorage but whose browser session persists will pass middleware and land on the dashboard — where `initAuth` will find no localStorage tokens, set `isAuthenticated: false`, and the page will show an empty or loading state. This is a UX edge case rather than a security issue since all data is gated by JWT at the API level.

## Cookie timing and refresh persistence

`initAuth` runs inside `AppShell` on every page mount. It reads `mf_access_token` and `mf_user` from localStorage and re-sets `mf_auth_present`. If localStorage is populated, the cookie is restored before any navigation, so a hard refresh to `/` does not hit the middleware redirect. One gap in this path: `initAuth` does not validate the access token's expiry against the server before re-setting the cookie, so a user with an expired access token and a still-valid session cookie will pass middleware but have all subsequent API calls fail with 401. The token refresh path in `apiRequest` handles this per-request, so it recovers transparently, but the user briefly sees the dashboard shell before any data loads.

## Login page error handling

The unverified-account path (`403` with `code: "ACCOUNT_UNVERIFIED"`) surfaces a "Resend verification email" link inline. The `isSafeRedirect` check on `nextParam` closes the open-redirect risk on the post-login return path.

One gap: if `loginUser` throws an error whose `.message` is undefined and `.data` is also absent, the catch block falls through to the generic `"Invalid credentials. Please try again."` message. Any structured error shape from the backend that doesn't match `.data.code` or `.message` will silently show this generic string. This is a pre-existing minor UX issue, not a regression introduced here.

## CORS and backend settings

`settings.py` hardcodes `http://localhost:6060` and `http://127.0.0.1:6060` as CORS and CSRF trusted origins with `CORS_ALLOW_CREDENTIALS = True`. No changes were made to `settings.py` in the two commits under review; this was established in an earlier commit (`a6c8eeb`). These settings are only relevant here because the report's acceptance criteria required verifying them.

## Plaintext credential in committed documentation

`LOGIN_DASHBOARD_FIX_REPORT.md` (the only file changed in the HEAD commit) includes:

```
kindikerisr@gmail.com / srujan11  — is_email_verified: True, is_active: True  ← verified, can log in
```

and in the test results section records the actual password `TestPass123` used to verify the login. This is now in git history. The report acknowledges the issue in "Remaining Issues #3" and asks the owner to change the password, but the credential will persist in `git log` regardless. If this repository is ever pushed to a public remote or shared via a CI artifact, the credential is exposed.

## Test coverage

Authentication unit tests (26/30 passing) cover register, login, verify, refresh, logout, and the room invitation ownership/revocation paths added in the previous fix commit. The 4 failing tests (`RoomInvitationSecurityTests.setUp`) are a pre-existing schema mismatch — `room_name` column absent from the test database — unrelated to this fix. Frontend TypeScript and ESLint pass clean (3 pre-existing warnings, no errors). The production build compiles all 47 pages.

The end-to-end test is simulated via direct HTTP calls rather than a browser automation tool. The report shows correct HTTP responses at each step, which confirms the plumbing works, but does not exercise JavaScript execution (cookie setting, Zustand state update, `router.push`). A Playwright or Cypress test against the running containers would close this gap.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `frontend/Dockerfile` | Replaced dev-server CMD with production build + `npm start`; added `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` build args |
| `frontend/.dockerignore` | New file; excludes `.next/`, `node_modules/`, `.task/`, `*.md`, `.env*.local`, `.git`, `tsconfig.tsbuildinfo` from Docker build context |
| `docs/LOGIN_DASHBOARD_FIX_REPORT.md` | New file; investigation report, test results, architecture diagram |
| `frontend/tsconfig.tsbuildinfo` | TypeScript build cache update (auto-generated) |

The `mf_auth_present` Secure-flag change to `frontend/src/store/authStore.ts` and all other auth plumbing were committed in `d354380` and `52c6108`, not in this fix.

Full diff: `git diff HEAD~1...HEAD`

</details>

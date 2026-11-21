# EMAIL_VERIFICATION_REDIRECT_FIX

## Root Cause

Clicking a MovieFlow email verification link opened Grafana (port 3000) instead of MovieFlow (port 6060).

The root cause was a cascade of incorrect defaults across four backend files:

1. **`backend/movieflow/settings.py`** — `FRONTEND_URL` was never read from the environment into Django settings. `accounts/utils.py` calls `getattr(settings, 'FRONTEND_URL', ...)`, so without a `settings.FRONTEND_URL` attribute, the fallback was always used.
2. **`backend/accounts/utils.py`** — The fallback for both `send_verification_email` and `send_password_reset_email` was `'http://localhost:3000'`.
3. **`backend/rooms/emails.py`** — Used `os.getenv("FRONTEND_URL", "http://localhost:3000")` at module import time (not Django settings), so it picked up the wrong default and ignored the env var in Docker.
4. **`backend/playback/providers/youtube_embed.py`** — `origin=http://localhost:3000` was hardcoded in the YouTube embed URL.
5. **`backend/.env.example`** — `FRONTEND_URL=http://localhost:6000` (wrong port 6000) and `CORS_ALLOWED_ORIGINS` listed port 3000.
6. **`backend/movieflow/settings.py`** — CORS fallback default was `localhost:3000`, and `CSRF_TRUSTED_ORIGINS` was not configured.

The `backend/.env` and `docker-compose.yml` already had the correct `FRONTEND_URL=http://localhost:6060`, but the value was never surfaced to Django settings, so the hardcoded fallbacks took effect.

---

## Files Changed

| File | Change |
|------|--------|
| `backend/movieflow/settings.py` | Added `FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:6060')`. Added `CSRF_TRUSTED_ORIGINS` populated from `CORS_ALLOWED_ORIGINS`. Changed CORS fallback defaults from port 3000 to port 6060. |
| `backend/accounts/utils.py` | Changed `getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')` fallback to `'http://localhost:6060'` in both `send_verification_email` and `send_password_reset_email`. |
| `backend/rooms/emails.py` | Removed module-level `os.getenv("FRONTEND_URL", "http://localhost:3000")`. Added `_get_frontend_url()` helper that reads `settings.FRONTEND_URL`. Removed unused `import os`. |
| `backend/playback/providers/youtube_embed.py` | Changed hardcoded `origin=http://localhost:3000` to `origin={settings.FRONTEND_URL}` in `get_content_details`. |
| `backend/.env.example` | Corrected `FRONTEND_URL=http://localhost:6000` → `http://localhost:6060`. Corrected `CORS_ALLOWED_ORIGINS` from port 3000 to port 6060. |
| `frontend/src/app/verify-email/page.tsx` | Changed success state button text from "Sign In" to "Continue to Login". Changed "Already Verified" state button from "Sign In" to "Continue to Login". All navigation uses relative paths (`/login`) — no hardcoded hostname. |

---

## Old URL vs Correct URL

| Context | Old URL | Correct URL |
|---------|---------|-------------|
| Email verification link | `http://localhost:3000/verify-email?token=TOKEN` | `http://localhost:6060/verify-email?token=TOKEN` |
| Password reset link | `http://localhost:3000/reset-password?token=TOKEN` | `http://localhost:6060/reset-password?token=TOKEN` |
| Room invitation link | `http://localhost:3000/invitations/TOKEN` | `http://localhost:6060/invitations/TOKEN` |
| YouTube embed origin | `http://localhost:3000` | `http://localhost:6060` |

---

## Environment Configuration (Authoritative Values)

```
FRONTEND_URL=http://localhost:6060
BACKEND_URL=http://localhost:8000          (frontend build arg)
NEXT_PUBLIC_API_URL=http://localhost:8000  (frontend build arg)
NEXT_PUBLIC_WS_URL=ws://localhost:8000     (frontend build arg)
CORS_ALLOWED_ORIGINS=http://localhost:6060,http://127.0.0.1:6060
CSRF_TRUSTED_ORIGINS=http://localhost:6060,http://127.0.0.1:6060  (derived from CORS)
```

The frontend container maps host port 6060 → container port 3000 (Next.js internal). The `FRONTEND_URL` in backend config must always refer to the external/host port (6060), never the internal container port.

---

## Verification Test Results

| # | Check | Result |
|---|-------|--------|
| 1 | `FRONTEND_URL` now read into `settings.FRONTEND_URL` from env | PASSED — confirmed in `settings.py` |
| 2 | Verification URL built from `settings.FRONTEND_URL` (not hardcoded port 3000) | PASSED — code inspection confirms `getattr(settings, 'FRONTEND_URL', 'http://localhost:6060')` |
| 3 | `docker compose config --quiet` | PASSED — exit code 0 |
| 4 | `docker compose up -d --build backend frontend` | PASSED — both images built, containers started |
| 5 | `docker compose ps` — backend running | PASSED — `movieflow_backend` Up, health: starting → healthy |
| 6 | `docker compose ps` — frontend running on port 6060 | PASSED — `0.0.0.0:6060->3000/tcp` |
| 7 | Backend logs clean (no errors) | PASSED — migrations applied, Daphne listening on 0.0.0.0:8000 |
| 8 | `FRONTEND_URL=http://localhost:6060` in container env | PASSED — confirmed via `docker exec movieflow_backend env` |
| 9 | `CORS_ALLOWED_ORIGINS=http://localhost:6060,...` in container env | PASSED — confirmed via `docker exec movieflow_backend env` |
| 10 | `CSRF_TRUSTED_ORIGINS` added to Django settings | PASSED — code inspection |
| 11 | No localhost:3000 in MovieFlow email link generation code | PASSED — code inspection of all changed files |
| 12 | Register test user, receive email, click link, verify on port 6060 | NOT TESTED — requires real SMTP delivery and manual browser test |
| 13 | Expired token error + resend flow | NOT TESTED — requires live environment manual test |
| 14 | Existing database records intact | NOT TESTED — `docker compose up` without `--volumes` or database reset; no volumes deleted |

---

## Remaining Blockers

None for the URL fix itself.

The following are pre-existing advisory items (not introduced by this fix):

- **Email delivery in development**: When `DEBUG=True` and `EMAIL_HOST_PASSWORD` is set in `.env`, Django uses SMTP. If the Gmail app password becomes invalid, emails will fail silently for the user. The backend logs `Verification email delivery failed for … SmtpError`. This is an operational concern, not a code bug.
- **`ReferenceError: location is not defined`** during static page generation of `/playlists/create`: This is a pre-existing issue in the frontend build (non-fatal warning, page still generates). It is outside the scope of this fix.
- **Advisory ESLint warnings**: Pre-existing, no build impact.

---

*Fix applied: 2025. Grafana configuration was not modified. No Docker volumes were deleted. No database records were altered.*

# MovieFlow — Backend Real-Time Core, Rooms & Personal Media Uploads

## Requirements Document

**Scope of this run:** Backend only (`backend/`, Django 5.1 + Channels 4 / Daphne). The frontend is touched in a separate run and is explicitly out of scope here. The existing working features — auth (`accounts`), friendships, notifications, entertainment (TMDB), music (MusicBrainz + playlists), and library — must keep working and must not lose data.

**Grounding:** This document is based on the read-only audit `docs/MOVIEFLOW_FEATURE_AUDIT.md` and a direct read of `rooms/models.py`, `playback/models.py`, `rooms/views.py`, `rooms/urls.py`, `movieflow/routing.py`, `movieflow/urls.py`, `library/models.py`, `music/models.py`, `accounts/models.py`, and `movieflow/settings.py`. Field names referenced below are the real model fields, not the broken view attributes.

**Status of the codebase today (as found):**
- `playback` models exist (`RoomPlaybackState`, `PlaybackSession`, `PlaybackEvent`, `PlaybackProvider`, `UserProviderConnection`, `ContentProviderAvailability`) but have **no migration** and **no urls/views**.
- `rooms` migration `0001_initial` creates only `Room`, `RoomParticipant`, `RoomSettings`, `RoomEvent`. `RoomInvitation`, `RoomMessage`, and the voice/mute/report/role-permission models are defined but **not migrated**.
- `rooms/views.py` references `invitation.room_name` and `invitation.invitee_email`, which do **not** exist on `RoomInvitation` (real fields: `room`, `inviter`, `invitee`, `email`, `token`, `status`, `expires_at`) → `AttributeError` 500s. There is **no endpoint** that creates a `Room` or a `RoomInvitation`.
- WebSocket routing (`movieflow/routing.py`) serves only `ws/health/`. There is **no room/playback consumer**. The ASGI layer uses `AuthMiddlewareStack` (session-based), which cannot authenticate the JWT-in-localStorage frontend.
- The deleted `playback/providers/` package survives only as `.pyc`; `playback/providers/youtube_embed.py` remains but imports the missing `playback.providers.base` → `ImportError`.
- There is no personal media file model anywhere (`FileField` exists only on `accounts.UserProfile.avatar`).

---

## Summary

Implement the backend of MovieFlow's "Watch Together / Listen Together" core: real-time room playback synchronization over WebSockets, a complete Rooms REST API (create, list, detail, join/leave/end, kick, invitations), JWT-based WebSocket authentication, personal movie/audio media uploads with authenticated streaming, a clean external-provider capability registry, additive database migrations, and a cleanup command for expired rooms and invitations. Migrations must be additive and must not drop existing tables or data. The fix direction for invitations is to correct the views to use the real model fields (`room.name`, `email`/`invitee`), not to add fake fields.

---

## Functional Requirements

### A. Migrations (additive, no data loss)

A1. Create `playback/migrations/0001_initial.py` for the existing playback models: `RoomPlaybackState`, `PlaybackSession`, `PlaybackEvent`, `PlaybackProvider`, `UserProviderConnection`, `ContentProviderAvailability`. Model field definitions may be adjusted minimally to produce a clean migration, but the model semantics must be preserved: server-authoritative position (`RoomPlaybackState.compute_current_position`), immutable event log (`PlaybackEvent`), provider catalog (`PlaybackProvider`), availability cache (`ContentProviderAvailability`), and session tracking (`PlaybackSession`).

A2. Create the missing `rooms` migrations for the models this feature needs — at minimum `RoomInvitation`, and `RoomMessage` if chat is used in the consumer. `makemigrations` will also include the other defined-but-unmigrated `rooms` models (voice/mute/report/role-permission/settings-revision); that is acceptable as long as every migration is additive and creates new tables only.

A3. `python manage.py makemigrations --check --dry-run` must report no missing migrations after the new files are in place.

A4. `python manage.py migrate` must apply cleanly against the existing `backend/db.sqlite3` without dropping existing tables or destroying existing rows (users, library items, friendships, notifications, etc. remain present).

### B. WebSocket auth + routing

B1. Add a JWT-capable WebSocket authentication mechanism that accepts the access token as a query parameter `?token=<jwt>` on the WebSocket URL and validates it against `djangorestframework-simplejwt`. This is the supported pattern for Channels + a JWT-in-localStorage frontend, given the existing `AuthMiddlewareStack` is session-based.

B2. Reject unauthenticated and invalid/expired-token WebSocket connections with a close code (do not accept the connection as anonymous).

B3. Register a room/playback consumer route in `backend/movieflow/routing.py`, e.g. `ws/rooms/<room_id>/`, pointing at a new consumer (one location, consistent across the feature).

B4. Remove or fix the broken `playback.providers.base` import path so importing the consumers/routing does not raise `ImportError` from the half-deleted providers package.

### C. Rooms REST API (`rooms/serializers.py`, `rooms/views.py`, `rooms/urls.py`)

C1. **Room creation:** `POST` creates a `Room` with `room_type` (`music` | `movie`), sets the creator as host (`RoomParticipant` role `host`), and accepts: a content reference (a personal uploaded item id, or external content id + provider), `name`, `visibility` (`private` | `public`), optional password, and `max_participants` (the model enforces `>= 2`). `Room.clean()` content-type compatibility rules must be honored (movie rooms accept `movie`/`tv_show`; music rooms accept `track`/`album`/`playlist`).

C2. **List / discover:** list the authenticated user's rooms and discoverable public rooms.

C3. **Room detail:** retrieve a room's members, current playback state, and content.

C4. **Join room:** enforce private-room access — a private room must not be joinable by knowing its room ID alone. Join requires a valid invitation token, host approval, or public visibility. Adds the user as a participant and returns the room state.

C5. **Leave / End / Kick:** leave room (participant self-action); end room (host only); remove/kick participant (host only).

C6. **Invitation creation:** `POST` creates a `RoomInvitation` with a unique `token` and `expires_at`, returning the invite link/token.

C7. **Invitation by-token GET:** fix the field mismatch — return `room.name` (not the nonexistent `invitation.room_name`), inviter details (`id`, `username`, `full_name`, `movieflow_id`), `status`, `expires_at`, and `is_expired`, matching the frontend `RoomInvitationData` contract.

C8. **Invitation Accept / Reject:** fix `invitee_email` references to use the real model fields (`invitee` / `email`).

C9. **Permissions:** DRF permission classes gate host-only actions (end, kick, playback control) to the host; join/leave are participant actions; private rooms reject unauthorized join. The authenticated request user is used (not a session).

### D. Playback sync WebSocket consumer

D1. **Connect:** authenticate via the JWT query param; load the `Room` and the requester's `RoomParticipant`; reject if the room is private and the user is not a member or invited; add the connection to the channels group `room_<id>`; send the full current authoritative state (current content, `is_playing`, computed position, track, participants).

D2. **Host-only commands:** `play`, `pause`, `seek` (to a position in seconds), and change track/content are host-only. Each command persists server-authoritative state into `RoomPlaybackState` (`last_updated_at` + `is_playing` + `position_seconds` + content ref) and records a `PlaybackEvent`, so position is recomputable on reconnect via `compute_current_position`.

D3. **Broadcast:** state changes are broadcast to the room group so all participants apply them. Volume is **local** — never broadcast or synchronized.

D4. **Participant events:** join/leave events are broadcast to the group with participant info.

D5. **Reconnection/recovery:** on (re)connect, always send the current authoritative state so a reconnecting client resyncs. Tolerate a client sending its current position to reconcile drift.

D6. **Host leaving:** transfer host to another participant or end the room gracefully, broadcasting a `room-ended` / `host-changed` event.

D7. **Error handling:** malformed messages, unknown room, and unauthorized control attempts return an error event and do not crash the consumer.

D8. **Both room types:** the same consumer works for music (`room_type=music`) and movie (`room_type=movie`) rooms; only the content reference differs.

### E. Personal media uploads

E1. **Models:** add personal-media models with an owner FK, title/description/metadata, `ImageField` poster/cover, `FileField` for the media file, `created_at`, `file_size`, and `content_type`, plus track-specific fields for audio (artist, album, duration). Allow uploaded tracks in playlists (either reuse `music.Playlist` with a relation to the uploaded track, or add a user-track playlist relation). These are additive migrations on the chosen app (recommended: `library` `0002_*`).

E2. **Upload endpoints:** multipart file upload for movies and tracks, mounted under `/api/v1/library/...`. Validate the **real** content type by inspecting file magic bytes (use `python-magic` if available, else a content-sniffing helper) — do not trust the file extension. Enforce configurable size limits (sensible defaults: movie 2 GB, audio 200 MB), settable in settings. Sanitize and store filenames safely (uuid prefix) under `MEDIA_ROOT` subfolders. Files are never stored in the DB.

E3. **Authenticated media serving:** a streaming view (e.g. `GET /api/v1/library/movies/<id>/stream/` and the tracks equivalent) that checks the request user owns the item **or** is a member of a room that references it, then streams the file with `FileResponse` / Range support for seeking. Private files must **not** be exposed under the public `MEDIA_URL`.

E4. **Management:** owner can list their own uploads, edit metadata, and delete (which also removes the file). Prevent path traversal via safe (uuid or sanitized) filenames.

E5. **Playback readiness:** the playback/room endpoints return enough for the frontend to render a `<video>`/`<audio>` element and join a room (authenticated stream URL + metadata).

### F. External provider capability registry

F1. Re-create `playback/providers/base.py` and `playback/providers/registry.py` fresh — do **not** restore the deleted scraping code. Implement a YouTube embed provider (authorized public iframe embed; no stream extraction).

F2. Define capability flags: `supports_embedded_playback`, `supports_group_playback`, `supports_synchronized_controls`, `supports_deep_link`, and `auth_requirements`.

F3. Expose capabilities via a REST endpoint (e.g. `/api/v1/playback/providers/` → list of providers + capabilities) and per-content availability. For providers that do not support synchronized playback, expose a `deep_link`/`launch_link` capability so the frontend can show a clearly-labelled synchronized-launch-link alternative.

F4. Mount `playback` URLs in `movieflow/urls.py`. Add a playback migration only for the provider/session tables actually used; keep it minimal and additive.

### G. Cleanup of expired rooms

G1. Add a Django management command `cleanup_expired_rooms` that marks/closes rooms past their expiry or with no active participants beyond a configurable threshold, and cleans expired `RoomInvitation` rows. No Celery. Document that it is run via cron / management command.

---

## Non-Functional Requirements

N1. **No regressions:** existing features (auth, friendships, notifications, entertainment, music, library) keep working and their tests keep passing.

N2. **Additive migrations only:** never drop existing tables/columns or destroy data. `migrate` is safe on the existing dev DB.

N3. **Security defaults:** least privilege at every endpoint and consumer; private media is never served unauthenticated; private rooms never leak by room ID; uploads are validated by content, not extension; filenames are sanitized to prevent path traversal.

N4. **Ports and CORS:** backend stays on `:8000`, frontend on `:6060`. CORS origins must keep `:6060` (no origin dropped).

N5. **Config-driven limits:** upload size limits and cleanup thresholds are configurable via settings/env, not hard-coded.

N6. **No new major infra:** no Celery, no Postgres switch, no new infrastructure. SQLite + local filesystem storage remain for dev.

---

## Acceptance Criteria

These are the testable, gate-able outcomes. Each maps to a verification step in the run plan.

1. `backend/venv/Scripts/python.exe manage.py check` (cwd `backend`) reports no issues.
2. `backend/venv/Scripts/python.exe manage.py makemigrations --check --dry-run` (cwd `backend`) is clean — no missing migrations.
3. `backend/venv/Scripts/python.exe manage.py migrate` (cwd `backend`) applies cleanly on the existing `db.sqlite3` without error, and existing users/library rows are still present afterward.
4. `backend/venv/Scripts/python.exe manage.py test` (cwd `backend`) passes; existing tests still pass and the new focused tests pass:
   - 4a. A non-member cannot join a private room by room ID alone (private room join rejection).
   - 4b. An invitation can be created and then accepted through the accept endpoint (invitation create + accept flow), and the accept/resolve endpoint no longer raises `AttributeError`.
   - 4c. A non-host participant issuing a playback command is rejected; only the host's command is applied (host-only playback control permission).
   - 4d. An upload with a content type that does not match its actual bytes (wrong MIME) is rejected (upload validation).
   - 4e. An authenticated media stream request from a non-owner, non-room-member is rejected (authenticated media streaming rejects non-owner).
5. The new endpoints resolve and reject anonymous users: at minimum the URL routes resolve and DRF permission classes reject unauthenticated requests (verified via the Django test client, or via curl against a briefly-running dev server: register/login → token → create room → create invitation → fetch invitation by token → list providers).
6. The WebSocket consumer imports cleanly and the room route resolves in `movieflow/routing.py` with no `ImportError` from the old half-deleted providers package.
7. No working endpoint regresses: auth login, friends list, notifications, entertainment discovery, music discovery, and library endpoints still respond as before (covered by the existing test suite passing plus a smoke check).
8. The `cleanup_expired_rooms` management command runs without error and closes/marks at least one expired room and removes at least one expired invitation in a test fixture.
9. All backend code changes are committed on the current branch (`master`).

---

## Out of Scope

- Any frontend change (separate run).
- The `administration` app (no admin endpoints in this run).
- Celery, async task queues, or any new infrastructure.
- Switching SQLite to PostgreSQL.
- Restoring the deleted provider scraping code (`open_cinema.py`, `tmdb_watch_providers.py`, the deleted `rooms/adapters/`).
- Voice/video (WebRTC / LiveKit) beyond the model definitions that already exist; the consumer handles playback sync, not media transport for voice.
- Chat features beyond what is needed for the playback consumer's participant/presence events (a full chat UI/REST surface is not required this run).
- Email delivery wiring for invitations (the `RoomInvitation` model has email-tracking fields, but actually sending invitation emails is not required; the token/link is returned by the creation endpoint).
- Production media serving backends (S3/CDN/Nginx) — local filesystem under `MEDIA_ROOT` is the dev storage target.
- Changing ports, CORS origins, or the custom user model.

---

## Assumptions

These are inferences where the request was ambiguous. The design review should validate them.

- **App placement for personal uploads:** the prompt recommends adding `UserMovie`/`UserTrack` to the `library` app. I treat that as the intended location. The `backend/media/` folder is `MEDIA_ROOT`, not an app, and will not be treated as an app.
- **Chat:** the prompt mentions `RoomMessage` only conditionally ("if you use chat"). I assume the consumer emits participant join/leave/presence events over the group but a full persisted chat REST surface is not required; `RoomMessage` migration is included only if chat persistence is used.
- **Room password:** `Room` has no password column today. The prompt says "optional password" for room creation. I assume either an additive field is added (additive migration) or a hash/secret is stored on the related `RoomSettings`; the exact storage is a design decision, but the requirement is that a private room can optionally require a password at join. Adding a column is additive and allowed.
- **Content reference shape:** a room's `content_id`/`content_type`/`playback_provider` already model the "universal content reference." Personal uploads are referenced by their new model id and a provider slug (e.g. `personal`), external content by TMDB/MB id + provider. The exact content-type strings for personal uploads are a design decision; `Room.clean()` may need to accept new content types (e.g. `personal_movie`/`personal_track`) via an additive change — flagged for design.
- **Stream authorization granularity:** "is a member of a room that references it" is taken to mean a current `RoomParticipant` of a room whose `RoomPlaybackState.current_content` (or `Room.content_id`) points at that upload. Exact matching rule is a design decision.
- **YouTube embed provider:** assumed to expose a `deep_link`/`launch_link` for synchronized-launch-link alternative and not to extract any stream, per "no stream extraction."
- **Verification gate item 5 (curl smoke):** if the dev server cannot be started in this environment, the Django test-client assertion (routes resolve + anonymous rejected) is an acceptable substitute, as the prompt explicitly allows.

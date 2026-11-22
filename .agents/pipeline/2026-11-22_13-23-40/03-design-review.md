# Design Review — `02-design.md` (Revision pass)

Revision review of `02-design.md` against `01-requirements.md`, with the design's claims about existing code verified against the source in `backend/`. A prior review (`03-design-review.md` / `design-review.json`, verdict `CHANGES_REQUESTED`: 1 HIGH, 8 MEDIUM, 7 NIT) exists; this pass first re-checks those 16 findings against the revised design, then reviews what changed.

**Verdict: CHANGES_REQUESTED** — 1 new MEDIUM finding (and 2 new NITs). All 16 prior findings are Closed. The new issue is a `update_or_create` host-demotion bug in the WebSocket connect / REST join path introduced by the Finding 13 fix (`get_or_create` → `update_or_create`), which breaks host-only playback control (Acceptance 4c).

---

## A. Prior findings — re-check

Each prior finding was re-checked against the revised design and the source. Disposition: **Closed** = the revision addresses it correctly; **Unchanged** = still present.

| # | Prior severity | Status | Re-check note |
|---|---|---|---|
| 1 | HIGH | **Closed** | §8.4 now mounts personal-media CRUD under the distinct prefix `/api/v1/library/uploads/movies/` (+ `/upload/`, `/<id>/`, `/<id>/stream/`) and `/api/v1/library/uploads/tracks/...`. Verified the existing `library/urls.py` registers `path('library/movies/', views.LibraryMoviesView.as_view(), name='library-movies')`; the `uploads/` prefix does not collide. §13 updated. |
| 2 | MEDIUM | **Closed** | §10 now has a step 2 that deletes terminal invitations (`status in (expired,rejected,revoked)`, `expires_at < now()-retention`) with `--invitation-retention-minutes` default `0`, so an invitation that crosses `expires_at` is marked expired in step 1 and deleted in step 2 the same run. `test_cleanup_command.py` asserts removal (Acceptance 8). |
| 3 | MEDIUM | **Closed** | Verified `playback/providers/youtube_embed.py` defines `id`/`name`/`provider_type` as `@property`. §9.2 now converts them to plain class attributes (and the new `DeepLinkOnlyProvider` likewise), so `cls.id` is the slug string and `get_provider('youtube-embed')` resolves. Registry stays class-keyed. §13 updated. |
| 4 | MEDIUM | **Closed** | §8.5 now uses a chunk-limited generator (`_range_reader`) on a `StreamingHttpResponse` with explicit `Content-Length`/`Content-Range`/`Accept-Ranges` and `status=206`; full-stream `200` fallback when `Range` is absent/unparseable. |
| 5 | MEDIUM | **Closed** | §8.1/§8.2 now agree: the view sets `instance._stored_ext` from the sniffed family before save, and `upload_to` prefers `instance._stored_ext`. |
| 6 | MEDIUM | **Closed** | §7.1 step 4 counts `joined` participants; if `>= max_participants` and the user is not already joined → `close(code=4409)`, documented in §7.6. |
| 7 | MEDIUM | **Closed** | §4.4 + §6.3: `RoomCreateSerializer` rejects `playback_provider='personal'` with `content_type` in `album`/`playlist`/`tv_show` → `400 INVALID_PERSONAL_CONTENT_TYPE`; personal playlist/album rooms backlogged (§15). Verified `Room.clean()` accepts `track`/`album`/`playlist` for music and `movie`/`tv_show` for movie, so the single-item `personal` rooms need no model change. |
| 8 | MEDIUM | **Closed** | Verified `RoomInvitation` has partial unique constraints `unique_pending_room_invitee` / `unique_pending_room_email` (condition `status='pending'`). §6.3/§6.7 now check for an existing pending invitation and reuse it (`200 already_pending`), wrapped in `transaction.atomic()` with an `IntegrityError` catch that falls back to fetch-and-reuse; added to the §6.8 error table. |
| 9 | MEDIUM | **Closed** | Verified `PlaybackEvent.EVENT_CHOICES` has only `PLAY/PAUSE/SEEK/BUFFERING/RESUMED/ENDED/ERROR/HOST_CHANGED/PARTICIPANT_JOINED/PARTICIPANT_LEFT` (no `CHANGE_CONTENT`). §7.3 logs `change_content` as `PlaybackEvent.EVENT_SEEK` with `new_position=0` and `metadata={'content_changed': True, ...}`; no model change. |
| 10 | NIT | **Closed** | Verified `rooms/0001_initial.py` `RoomEvent.event_type` has 12 choices; the model now defines ~24. §4.2 lists the `AlterField` on `RoomEvent.event_type` (choice expansion, data-safe); §4.5 softened to "CreateModel + AddField-with-default + choice-only AlterField". |
| 11 | NIT | **Closed** | §4.3 dependency stated as `('music', '0002_phase8_playlist_visibility_collaborators')` (verified to be music's latest); `makemigrations` sets it automatically. |
| 12 | NIT | **Closed** | §7.1 step 3 specifies the match rule: `inv.invitee_id == user.id` OR (`inv.invitee is None` and `inv.email == user.email`), and `not inv.is_expired`; email-invite users may connect directly via WS. |
| 13 | NIT | **Closed** (but see Finding 17) | §6.4/§6.5/§7.1 now use `update_or_create` to flip an existing `(room, user)` row back to `joined` (instead of `get_or_create`, which left it `left`). The mechanism, however, introduces a new bug — see Finding 17. |
| 14 | NIT | **Closed** | §4.2/§13: `Room.password_hash = models.CharField(max_length=255, blank=True, default='')`. |
| 15 | NIT | **Closed** | §8.2 explicitly `file.seek(0)` after sniffing (and after the size pre-check) before the `FileField` saves. |
| 16 | NIT | **Closed** | §7.3 parenthetical removed; rule stated: `change_content` to a `personal` reference requires the `UserMovie`/`UserTrack` to be owned by the host; external references accepted as-is. |

All 16 prior findings are Closed. None are Unchanged or backlogged.

---

## B. New findings (reviewing what changed)

Numbered continuing from the prior sequence.

### 17. [MEDIUM] `update_or_create` with `role` in `defaults` demotes a reconnecting host, breaking host-only control

**Where:** §6.4 (`RoomInvitationAcceptView` snippet), §7.1 Connect step 5 ("new row → role `participant`"), §6.5 join ("`update_or_create` a `joined` participant").

**Problem:** Django's `update_or_create` does **not** apply `defaults` only on create — it applies them to the existing row on update too. Verified in `backend/venv/.../django/db/models/query.py`:
```python
obj, created = self.select_for_update().get_or_create(create_defaults, **kwargs)
if created:
    return obj, created
for k, v in resolve_callables(update_defaults):   # <- defaults applied to the EXISTING object
    setattr(obj, k, v)
...
obj.save(using=self.db, update_fields=update_fields)
```
The host's `RoomParticipant(role=host, status=joined)` row is created at room creation (§6.3). When the host then connects via the WS consumer (§7.1 step 5) — which they must, to control playback — an `update_or_create(... defaults={'role': 'participant', 'status': 'joined', ...})` finds the existing host row and overwrites `role` to `participant`. The host is then no longer a controller (`_is_controller` returns `False`) and `IsHost`/`IsRoomParticipant` host checks for `end`/`kick` fail. This breaks host-only playback control — Acceptance 4c — and the host cannot drive the room at all. §6.4 shows the exact `defaults={'role': RoomParticipant.ROLE_PARTICIPANT, ...}` pattern, which an implementer will mirror in §7.1/§6.5. (§6.4 Accept itself is mostly safe — the invitee is never the host — but the pattern propagates to the paths that bite the host.)

**Fix:** Do **not** put `role` in the `defaults` dict. The model default `RoomParticipant.role = 'participant'` already supplies `participant` for genuinely new rows, so an existing host keeps `role='host'`. In WS connect and REST join:
```python
RoomParticipant.objects.update_or_create(
    room=room, user=user,
    defaults={'status': RoomParticipant.STATUS_JOINED,
              'joined_at': now, 'left_at': None,
              'connection_status': RoomParticipant.CONNECTION_CONNECTED,
              'last_seen_at': now})   # no 'role'
```
If role must be set explicitly only on create, use Django 5.1's `create_defaults` (applied on create only) for `role` and keep `defaults` (applied on update) to the status/connection fields. Update the §6.4 snippet the same way for consistency.

### 18. [NIT] §4.2 AddField-on-`Room` list omits `Room.playback_provider`

**Where:** §4.2 (lists only `password_hash` as the `Room` AddField); §4.4 (relies on `room.playback_provider == 'personal'`); §7.3 consumer resolution by provider slug.

**Problem:** The current `Room` model defines `playback_provider = models.CharField(max_length=50, blank=True, default='')`, but `rooms/migrations/0001_initial.py`'s `Room` `CreateModel` does **not** include `playback_provider` (verified — the 0001 `Room` fields are `id, name, description, room_type, content_type, content_id, content_title, content_artwork_url, content_metadata, cover_artwork_url, visibility, status, max_participants, scheduled_start_time, actual_start_time, end_time, created_at, updated_at, host`). So `makemigrations rooms` will emit an `AddField` for `Room.playback_provider` in `0002`, in addition to `password_hash`. §4.2's enumeration lists only `password_hash`. The `playback_provider` column is the very thing §4.4's personal-content convention and the consumer's "resolve by provider slug" path depend on. It is additive (`default=''`), so a `makemigrations`-generated `0002` is data-safe and Acceptance 2/3 still pass — but the §4.2 enumeration is incomplete (same class of omission as the prior Finding 10), and a hand-written `0002` following §4.2 literally would leave `playback_provider` unmigrated and fail `makemigrations --check`.

**Fix:** Add to §4.2's AddField-on-`Room` list: "`playback_provider` (`models.CharField(max_length=50, blank=True, default='')` — present in the model, missing from `0001_initial`; `AddField`, data-safe)."

### 19. [NIT] §6.5 private-room password wording contradicts itself (AND vs OR)

**Where:** §6.5 ("If the room has `password_hash` set, **also require** a matching password (`check_password`) — **a valid token or a valid password** satisfies private access."); §11 invariant ("both require token/password/membership").

**Problem:** The first clause ("also require a matching password") reads as AND — a valid invitation token *and* the password — while the second clause ("a valid token or a valid password satisfies private access") reads as OR. C4 and the password assumption intend OR: for a password-protected private room, a valid non-expired pending invitation token *or* the correct password each independently grants access. The "also require" phrasing could be implemented as requiring both, which would make a password-protected room unjoinable by password alone (contradicting the "optional password" requirement).

**Fix:** State the rule unambiguously and drop the "also require" wording, e.g.: "If the room has `password_hash` set, a matching password (`check_password`) grants access; a valid non-expired pending invitation token **or** the correct password independently satisfies private access. No valid token and no valid password → `403 PRIVATE_ROOM_ACCESS_REQUIRED`." Update §11's "both require token/password/membership" to "token **or** password **or** membership".

---

## Verified Assumptions (this round)

Confirmed against source in `backend/`:

- All 16 prior findings' dispositions match the source; each is Closed (see the re-check table).
- `Manager.update_or_create` applies `defaults` to the existing row on update (`django/db/models/query.py`) — basis for Finding 17.
- `Room.playback_provider` is in `rooms/models.py` (`CharField(max_length=50, blank=True, default='')`) but **not** in `rooms/migrations/0001_initial.py` `Room` `CreateModel` — basis for Finding 18.
- `playback/providers/youtube_embed.py` defines `id`/`name`/`provider_type` as `@property` and imports the missing `playback.providers.base` → recreating `base.py` resolves the import (Finding 3 closed correctly).
- `RoomInvitation` has partial unique constraints `unique_pending_room_invitee` (condition `Q(status='pending', invitee__isnull=False)`) and `unique_pending_room_email` (condition `Q(status='pending', email__gt='')`) — Finding 8 closed correctly.
- `PlaybackEvent.EVENT_CHOICES` = `PLAY/PAUSE/SEEK/BUFFERING/RESUMED/ENDED/ERROR/HOST_CHANGED/PARTICIPANT_JOINED/PARTICIPANT_LEFT` (no `CHANGE_CONTENT`) — Finding 9 closed correctly.
- `rooms/migrations/0001_initial.py` creates only `Room`/`RoomParticipant`/`RoomSettings`/`RoomEvent`; `RoomParticipant` lacks `readiness_state`/`connection_status`/`last_seen_at`/`is_mic_muted`/`is_camera_off`/`device_check_completed`; `RoomSettings` lacks `chat_permission_mode`/`voice_permission_mode`/`video_permission_mode`/`room_reminders_enabled`/`participant_join_alerts`/`room_event_alerts`/`allow_cohosts`/`invite_policy`; `RoomSettings.playback_permission_mode` default `host_only` is already in 0001 — Findings 10/14 closed correctly and §7.3's host-only default holds.
- `RoomEvent.event_type` in 0001 has 12 choices; the model defines 24 — Finding 10 closed correctly.
- `Room.clean()` accepts `movie`/`tv_show` for movie rooms and `track`/`album`/`playlist` for music rooms; `max_participants >= 2` enforced — §4.4's "no model change for personal `movie`/`track` rooms" verified.
- `RoomParticipant.role` defaults to `participant`; the host participant is created with `role=host` at room creation (§6.3) — basis for the Finding 17 demotion path.
- `accounts.User` has `id` (UUID), `username`, `full_name`, `movieflow_id`, `is_email_verified`, `is_active`, `email` — matches the §6.3 inviter contract; `accounts/middleware.py` does not exist (genuinely NEW).
- `library/urls.py` registers `library/movies/` (`LibraryMoviesView`); the distinct `uploads/` prefix avoids collision (Finding 1 closed). Existing `library` models (`UserLibraryItem`, `UserCollection`, `CollectionItem`, `UserFavorite`, `UserFollow`) don't collide with the new `UserMovie`/`UserTrack`/`UserTrackPlaylistItem`.
- `music.Playlist` has an `owner` FK — the §8.4 playlist-link "owner of track+playlist" check is feasible.
- `core/consumers.py` `HealthConsumer.connect` calls `self.accept()` unconditionally and ignores `scope['user']` → replacing `AuthMiddlewareStack` with `JWTQueryAuthMiddleware` on the websocket branch keeps health working with anonymous connects.
- `movieflow/settings.py`: `INSTALLED_APPS` includes `playback`/`rooms`/`library`/`music`/`accounts`/`core`; `REST_FRAMEWORK` default auth is `JWTAuthentication`; `CORS_ALLOWED_ORIGINS` keeps `:6060`; `FRONTEND_URL = 'http://localhost:6060'`; `MEDIA_ROOT = BASE_DIR/'media'`; channel layer is InMemory under tests (`TESTING = 'test' in sys.argv`); `ASGI_APPLICATION` set; `AUTH_USER_MODEL = 'accounts.User'`.
- `playback/migrations/` has no migration (only `__init__.py`) → a `0001_initial` is genuinely needed.
- `movieflow/routing.py` serves only `ws/health/`; `movieflow/asgi.py` uses `AuthMiddlewareStack` (session) on the websocket branch; `movieflow/urls.py` does not include `playback.urls` (all genuinely NEW).

## Unverified / Wrong Assumptions (this round)

- **(Wrong) `update_or_create` `defaults` are create-only (§6.4/§7.1/§6.5):** Django applies `defaults` to the existing row on update, so `role` in `defaults` overwrites an existing host's `role='host'` to `participant`. See Finding 17.
- **(Incomplete) §4.2 implies the only `Room` AddField in `0002` is `password_hash`** — `Room.playback_provider` is also in the model but absent from `0001_initial` and must be `AddField`'d. See Finding 18.
- **(Ambiguous) §6.5 "also require a matching password … or a valid password"** — the AND vs OR reading is contradictory. See Finding 19.

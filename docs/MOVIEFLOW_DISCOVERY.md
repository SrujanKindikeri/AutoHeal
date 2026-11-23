# MovieFlow Application Discovery & Architecture Report

**Project:** INT333 AutoHeal — Phase 2: MovieFlow Discovery  
**Repository Path:** `C:\Users\kindi\OneDrive\Documents\AutoHeal\MultiFlow\MultiFlow`  
**Date of Audit:** 2026-11-22  
**Audit Mode:** Read-Only Source & Architecture Inspection  

---

## Executive Summary

MovieFlow (also structured under the directory name MultiFlow) is a social entertainment and media discovery web application. It combines movie and TV discovery (TMDB), music browsing and playlist management (MusicBrainz & Cover Art Archive), social networking (friend requests, user profiles, blocking, activity notifications), real-time synchronized watch rooms (MovieFlow Watch), listening rooms (MovieFlow Listen), private room invitation workflows, and personal media upload and streaming with HTTP Range support.

The platform is constructed as a decoupled architecture:
- **Backend:** Python 3.11, Django 5.1, Django REST Framework 3.15, Django Channels 4.1, and Daphne ASGI server 4.1.
- **Frontend:** Next.js 14.2 (App Router), React 18.3, TypeScript 5.6, Tailwind CSS 3.4, Zustand 5.0, and TanStack React Query 5.59.
- **State & Coordination:** PostgreSQL 16 (relational data), Redis 7 (Channels layer and caching).
- **Container Orchestration:** Multi-service `docker-compose.yml` running PostgreSQL, Redis, Django/Daphne, and Next.js.

The backend possesses complete data models, database migrations, REST endpoints, and WebSocket synchronization consumers for rooms, playback state, and media uploads. The frontend contains comprehensive, polished Apple-inspired white Liquid Glass interfaces for authentication, user profiles, friendships, movie/TV discovery, and music/playlist libraries. However, frontend implementations for real-time room synchronization (`/watch-together`) and personal media file uploads are currently stubs or mockups, not yet wired to the backend endpoints.

---

## 1. Project Overview

- **Mission:** Provide an Apple-inspired social entertainment platform that unites movie streaming, music listening, synchronized watch parties, social connectivity, and real-time voice communication.
- **Current Development Status:**
  - **Core Foundation (Phases 1–4):** Architecture, custom user model, MovieFlow ID generator, JWT authentication, email verification, password reset, friendships, and notifications are implemented and verified.
  - **Discovery Layer (Phases 5–7):** TMDB movie/TV metadata proxy, MusicBrainz music metadata, user playlists, and universal library items are operational.
  - **Media & Rooms Layer (Phases 8+):** Personal movie and audio file uploads (`UserMovie`, `UserTrack`), chunked HTTP Range streaming, room lifecycle management (`Room`, `RoomParticipant`, `RoomInvitation`), and WebSocket room synchronization (`RoomPlaybackConsumer`) are implemented on the backend.
  - **Frontend Parity:** Frontend features a complete design system and responsive navigation shell (`AppShell`, `DesktopSidebar`, `MobileNavigation`). Discovery, library, friends, and auth pages are connected. The `/watch-together` page is a preview stub; `/listen-together` has no page directory; personal file upload forms are not yet built in the frontend.

---

## 2. Frontend Framework, Language, and Architecture

- **Framework:** Next.js 14.2.18 (App Router architecture with React Server Components and Client Components).
- **Language & Types:** TypeScript 5.6.3 (`tsconfig.json` with strict type-checking and path alias `@/*` -> `./src/*`).
- **Core Dependencies (`frontend/package.json`):**
  - `react`: `^18.3.1`
  - `react-dom`: `^18.3.1`
  - `next`: `^14.2.18`
  - `zustand`: `^5.0.1` (client state store)
  - `@tanstack/react-query`: `^5.59.16` (server state management & caching)
  - `framer-motion`: `^11.11.11` (animations)
  - `lucide-react`: `^0.454.0` (Apple-style iconography)
  - `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`: Drag-and-drop playlist and collection reordering
  - `tailwindcss`: `^3.4.14`, `postcss`: `^8.4.47`, `autoprefixer`: `^10.4.20`, `clsx`, `tailwind-merge`
- **Design System & Styling:**
  - Custom Apple-inspired White Liquid Glass design language (`docs/MOVIEFLOW_WHITE_UI_UX_REDESIGN.md`).
  - Reusable component library in `frontend/src/components/ui/` (18+ components: `Button`, `IconButton`, `Input`, `SearchBar`, `Avatar`, `AvatarGroup`, `Badge`, `Tooltip`, `Dropdown`, `Modal`, `Drawer`, `Tabs`, `Toast`, `Skeleton`, `EmptyState`, `MediaCard`, `SectionHeader`, `GlassPanel`, `NavigationItem`).
  - Application Navigation in `frontend/src/components/navigation/`: `AppShell`, `AppHeader`, `DesktopSidebar`, `MobileNavigation`.
- **State Architecture:**
  - `authStore.ts` (`frontend/src/store/authStore.ts`): Zustand store holding `user`, `accessToken`, `refreshToken`, `isAuthenticated`, with manual persistence to `localStorage` (`mf_access_token`, `mf_refresh_token`, `mf_user`).
  - Remote Data: Handled through TanStack React Query hooks (`hooks/useLibrary.ts`, `hooks/useWatchlist.ts`) and direct API service clients.
  - Room / Playback State: Currently managed via local demo React `useState` hooks inside `watch-together/page.tsx`. No dedicated Zustand playback store or WebSocket client manager exists in the frontend.
- **Frontend Page Inventory (`frontend/src/app/`):**
  - Public & Auth: `/login`, `/register`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/email-verification-success`
  - User & Profile: `/profile`, `/complete-profile`, `/settings/account`, `/settings/connections`, `/settings/notifications`, `/settings/security`
  - Social: `/friends`
  - Discovery: `/movies`, `/movies/trending`, `/movies/popular`, `/movies/top-rated`, `/movies/upcoming`, `/movies/[id]`, `/movies/[id]/watch` (placeholder), `/shows`, `/shows/[id]`, `/search`
  - Music: `/music`, `/music/trending`, `/music/new-releases`, `/music/genres`, `/music/search`, `/music/track/[id]`, `/music/album/[id]`, `/music/artist/[id]`, `/playlists`, `/playlists/[id]`, `/playlists/create`, `/playlists/discover`
  - Library: `/library`, `/library/movies`, `/library/shows`, `/library/music`, `/library/collections`, `/library/collections/[id]`, `/library/favorites`, `/watchlist`, `/continue-watching`
  - Synchronized Rooms: `/watch-together` (UI stub; "New Room" disabled), `/invitations/[token]` (invitation accept/reject)
  - Administration: `/admin`, `/admin/users`, `/admin/moderation`, `/admin/analytics` (frontend views exist; backend endpoints not mounted)

---

## 3. Backend Framework, Language, and Architecture

- **Language & Runtime:** Python 3.11 (`backend/Dockerfile` based on `python:3.11-slim`).
- **Framework:** Django 5.1 (`Django>=5.1.0,<5.2.0`).
- **REST Layer:** Django REST Framework 3.15 (`djangorestframework>=3.15.2`), `djangorestframework-simplejwt>=5.3.1`.
- **Asynchronous & WebSocket Layer:** Django Channels 4.1 (`channels>=4.1.0`), Daphne ASGI server 4.1 (`daphne>=4.1.2`), `channels-redis>=4.2.0`.
- **Database Driver:** `psycopg2-binary>=2.9.9`.
- **Image Processing:** `Pillow>=11.0.0`.
- **Architecture & App Breakdown (`backend/`):**
  - `movieflow/`: Root project configuration (`settings.py`, `asgi.py`, `wsgi.py`, `urls.py`, `routing.py`).
  - `accounts/`: Custom `User` model, cryptographic `movieflow_id`, `UserProfile`, tokens, audit logs, JWT query authentication middleware.
  - `friendships/`: Canonical friendship records, bidirectional requests, user blocking, social search.
  - `notifications/`: Event-driven user notifications and unread badge counters.
  - `entertainment/`: TMDB caching proxy for movies, TV series, multi-search, genres, user watchlist.
  - `music/`: MusicBrainz and Cover Art Archive proxy, user playlists, track ordering, playlist collaboration.
  - `library/`: User collections, favorites, followed artists, personal movie/music upload models (`UserMovie`, `UserTrack`), Range streaming views.
  - `rooms/`: Universal rooms (`Room`), participant lifecycle, invitation tokens, room password verification, WebSocket room playback consumer (`RoomPlaybackConsumer`).
  - `playback/`: Legal playback providers, availability checking, playback session records, server-authoritative playback position state (`RoomPlaybackState`).
  - `history/`: Watch history, listening history, room session history, recommendation feedback.
  - `administration/`: Administrative roles, moderation reports, user account restrictions, platform settings.
  - `core/`: System health check REST API (`HealthCheckView`) and WebSocket health monitor (`HealthConsumer`).

---

## 4. Database and Data Flow

### 4.1 Database Engines & Configuration
- **Production / Docker:** PostgreSQL 16 (`postgres:16-alpine`), configured via `DATABASE_URL` (or discrete `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`).
- **Development Fallback:** SQLite 3 (`backend/db.sqlite3`), active when `USE_SQLITE=True` in `backend/.env`.

### 4.2 Data Models & Table Names
| App | Model | Database Table | Key Attributes / Relationships |
|---|---|---|---|
| `accounts` | `User` | `mf_users` | UUID PK, unique email, unique username, immutable `movieflow_id`, `is_email_verified`. |
| `accounts` | `UserProfile` | `accounts_userprofile` | One-to-one to `User`, `avatar`, `bio`, preferred genres, privacy controls. |
| `accounts` | `EmailVerificationToken` | `accounts_emailverificationtoken` | SHA-256 hashed token, 24-hour expiration. |
| `accounts` | `PasswordResetToken` | `accounts_passwordresettoken` | Single-use token, 1-hour expiration. |
| `accounts` | `AuditLog` | `accounts_auditlog` | User security event audit log. |
| `friendships` | `Friendship` | `friendships_friendship` | Canonical ordering (`user1_id < user2_id`). |
| `friendships` | `FriendRequest` | `friendships_friendrequest` | Sender, receiver, status (`pending`, `accepted`, `rejected`, `cancelled`). |
| `friendships` | `UserBlock` | `friendships_userblock` | Blocker, blocked user, mutual visibility prevention. |
| `notifications` | `Notification` | `notifications_notification` | Recipient, actor, verb, target, read boolean. |
| `entertainment` | `Movie`, `TVShow` | `entertainment_movie`, `_tvshow` | TMDB cached metadata, poster/backdrop URLs, vote average. |
| `entertainment` | `Watchlist` | `entertainment_watchlist` | User FK, media reference, unique per user+content. |
| `music` | `MusicArtist`, `Album`, `Track` | `music_*` | MusicBrainz metadata cache keyed by `mbid`. |
| `music` | `Playlist`, `PlaylistTrack` | `music_playlist`, `_playlisttrack` | User-owned playlists, track positioning, privacy. |
| `music` | `PlaylistCollaborator` | `music_playlistcollaborator` | Collaborative editing permissions (`view`, `edit`, `admin`). |
| `library` | `UserLibraryItem` | `library_items` | Content relationship across movies, TV, music, albums. |
| `library` | `UserCollection`, `CollectionItem`| `library_collections`, `_items` | Custom user collections with ordered items. |
| `library` | `UserFavorite`, `UserFollow` | `library_favorites`, `_artist_follows`| Fast-access favorites and followed artists. |
| `library` | `UserMovie` | `library_user_movies` | User-uploaded movie file, poster, file size, MIME type, processing status. |
| `library` | `UserTrack` | `library_user_tracks` | User-uploaded audio file, cover art, file size, MIME type, duration. |
| `library` | `UserTrackPlaylistItem` | `library_user_track_playlist_items` | Links personal audio track into `music.Playlist`. |
| `rooms` | `Room` | `rooms_room` | Host FK, `room_type` ('movie'/'music'), `visibility` ('public'/'private'), `status`, `password_hash`, `playback_provider`. |
| `rooms` | `RoomParticipant` | `rooms_roomparticipant` | User FK, Room FK, role ('host', 'participant'), connection status. |
| `rooms` | `RoomInvitation` | `rooms_roominvitation` | Token-based invite, email/user target, expiration. |
| `rooms` | `RoomMessage`, `Reaction`, `Report` | `rooms_roommessage`, etc. | In-room real-time chat messages and reactions. |
| `rooms` | `VoiceSession`, `VoiceParticipant` | `rooms_voicesession`, etc. | WebRTC / LiveKit voice session tracking. |
| `playback` | `PlaybackProvider` | `playback_playbackprovider` | Registered playback sources and capability flags. |
| `playback` | `PlaybackSession` | `playback_playbacksession` | Active stream session, stream type (`mp4`, `hls`, `embed`), duration. |
| `playback` | `RoomPlaybackState` | `playback_roomplaybackstate` | Authoritative server playback clock, position, play/pause, version counter. |
| `playback` | `ContentProviderAvailability` | `playback_contentprovideravailability`| Regional streaming availability. |
| `history` | `WatchHistory`, `ListeningHistory` | `history_watchhistory`, etc. | Progress and timestamped consumption records. |
| `administration`| `AccountRestriction`, `AdminAuditLog`| `administration_*` | Moderation, suspension, platform audit logs. |

### 4.3 Database Migrations
All apps have full, valid migration chains:
- `accounts`: `0001_initial.py`
- `friendships`: `0001_initial.py`
- `notifications`: `0001_initial.py`
- `entertainment`: `0001_initial.py`
- `music`: `0001_initial.py`, `0002_phase8_playlist_visibility_collaborators.py`
- `library`: `0001_initial.py`, `0002_usertrack_usertrackplaylistitem_usermovie_and_more.py`
- `rooms`: `0001_initial.py`, `0002_room_password_hash_room_playback_provider_and_more.py`
- `playback`: `0001_initial.py`
- `history`: `0001_initial.py`
- `administration`: `0001_initial.py`

---

## 5. Authentication

### 5.1 Architecture & Token Handling
- **JWT Framework:** `rest_framework_simplejwt`.
- **Token Configuration (`backend/movieflow/settings.py`):**
  - Access Token Lifetime: `JWT_ACCESS_MINUTES` (default 60 minutes).
  - Refresh Token Lifetime: `JWT_REFRESH_DAYS` (default 7 days).
  - Token Rotation: Enabled (`ROTATE_REFRESH_TOKENS = True`).
  - Blacklisting: Enabled on rotation and logout (`BLACKLIST_AFTER_ROTATION = True`).
- **Transport & Storage:**
  - Standard Bearer token authentication in HTTP `Authorization` headers.
  - Refresh token is stored in `HttpOnly` cookie `mf_refresh` and in `localStorage` (`mf_refresh_token`).
  - Frontend auto-refreshes expired access tokens upon receiving HTTP 401 responses (`frontend/src/lib/authApi.ts:38-67`).
- **WebSocket Handshake Authentication:**
  - `JWTQueryAuthMiddleware` (`backend/accounts/middleware.py`) parses `?token=<jwt>` from the WebSocket connection query string, resolves the token against `rest_framework_simplejwt.tokens.AccessToken`, and attaches the authenticated user to `scope['user']`.

### 5.2 MovieFlow ID
- Custom alphanumeric identifier in format `MF-XXXXXXXX` (e.g., `MF-8K29X7P4`).
- Generated cryptographically upon user creation via `accounts/utils.py`.
- Immutable after creation (attempting to alter it on existing records raises a `ValueError` in `User.save()`).
- Indexed for fast friend lookups and profile discovery (`/api/v1/users/by-movieflow-id/<id>/`).

### 5.3 Verification and Security Flows
- **Email Verification:** Account creation dispatches a 24-hour verification token. Login checks `is_email_verified`; if false, access is rejected with `ACCOUNT_UNVERIFIED` (HTTP 403).
- **Password Reset:** Generates a secure, single-use token expiring in 1 hour; enumeration-safe (endpoints return success regardless of whether the email exists).
- **Rate Throttling:** Strict rates enforced via DRF: `auth_login`: 15/min, `auth_register`: 10/min, `auth_password_reset`: 5/min, `auth_resend_verification`: 3/hour.

---

## 6. Movie and Music Upload Functionality

### 6.1 Backend Upload Implementation (`backend/library/`)
Personal media file uploads are implemented in the `library` Django app:
- **Models:**
  - `UserMovie` (`backend/library/models.py:214-260`): Stores user movie file (`movie_file`), poster (`poster`), title, description, genre, release year, file size, detected MIME type, and processing status (`processing`, `ready`, `error`).
  - `UserTrack` (`backend/library/models.py:262-297`): Stores audio track file (`audio_file`), cover artwork (`cover_image`), track title, artist, album, genre, duration in seconds, file size, and detected MIME type.
- **Upload Endpoints (`backend/library/urls.py` & `views.py`):**
  - `POST /api/v1/library/uploads/movies/`: Uploads a movie file and optional poster.
  - `GET /api/v1/library/uploads/movies/`: Lists all movies uploaded by the authenticated user.
  - `GET/PATCH/DELETE /api/v1/library/uploads/movies/<movie_id>/`: Retrieves, updates metadata, or deletes the uploaded movie file.
  - `POST /api/v1/library/uploads/tracks/`: Uploads an audio track and optional cover image.
  - `GET /api/v1/library/uploads/tracks/`: Lists all tracks uploaded by the authenticated user.
  - `GET/PATCH/DELETE /api/v1/library/uploads/tracks/<track_id>/`: Retrieves, updates metadata, or deletes the audio track.
- **Magic-Byte Sniffing Validation (`backend/library/content_validation.py`):**
  - Uses an in-house byte sniffer to prevent spoofed file extensions.
  - Allowed Video: MP4 (`ftyp`), MOV, MKV, WebM (`0x1a45dfa3`), FLV, WMV, OGV, AVI (`RIFF....AVI `).
  - Allowed Audio: MP3 (`ID3` or sync bytes), AAC, M4A, FLAC (`fLaC`), OGG (`OggS`), WAV (`RIFF....WAVE`), AIFF (`FORM....AIFF`), WMA.
- **File Size Limits:**
  - Movie file: 2 GB (`UPLOAD_MAX_MOVIE_BYTES`).
  - Audio file: 200 MB (`UPLOAD_MAX_AUDIO_BYTES`).
  - Poster / cover image: 10 MB (`UPLOAD_MAX_IMAGE_BYTES`).
- **Streaming Implementation (`views.py:403-442`):**
  - `GET /api/v1/library/uploads/movies/<id>/stream/` and `GET /api/v1/library/uploads/tracks/<id>/stream/`.
  - Implements HTTP 206 Partial Content with `Range` header support (`Accept-Ranges: bytes`, `Content-Range: bytes start-end/total`).
  - Access Authorization: Allowed if request user is the file owner **OR** an active participant (`RoomParticipant.STATUS_JOINED`) in a live room where `room.content_id == file_id`.

### 6.2 Frontend Upload Status
- **Missing / Not Connected:** No upload forms, drag-and-drop file inputs, or upload client functions exist in `frontend/src/`. The frontend currently only references TMDB and MusicBrainz catalog content.

---

## 7. Media Storage

- **Storage Location:**
  - Defined by `MEDIA_ROOT = BASE_DIR / 'media'` (`backend/media/`).
  - `MEDIA_URL = 'media/'`.
- **Directory Structure:**
  - User avatars: `media/avatars/`
  - Uploaded movies: `media/uploads/movies/`
  - Movie posters: `media/uploads/movie_posters/`
  - Uploaded tracks: `media/uploads/tracks/`
  - Track covers: `media/uploads/track_covers/`
- **Docker Volume Mount:**
  - Mapped in `docker-compose.yml` via named volume `media_volume:/app/media`.
- **Production Serving Caveat:**
  - In `backend/movieflow/urls.py`, `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)` is only appended when `DEBUG=True`.
  - For streaming of user-uploaded movies and tracks, `UploadedMovieStreamView` and `UploadedTrackStreamView` bypass the public static handler, serving chunks via authenticated Python generators.
  - However, public avatars and static media have no production web server (such as Nginx, Cloud Storage, or S3) configured when `DEBUG=False`.

---

## 8. Playback Functionality

### 8.1 Backend Models & Capabilities (`backend/playback/`)
- `PlaybackProvider`: Defines external or internal streaming sources with capability flags:
  - `supports_embedded_playback`
  - `supports_external_playback`
  - `supports_group_playback`
  - `requires_auth`
  - `supported_territories`
- `PlaybackSession`: Represents an active playback lifecycle (`mp4`, `hls`, `embed_iframe`, `external_deep_link`) associated with a user or room.
- `RoomPlaybackState` (`backend/playback/models.py:340-450`): Server-authoritative synchronization engine:
  - `compute_current_position()`: Calculates virtual playback position using monotonic elapsed server time:  
    `position_seconds + (now - last_updated_at) * playback_rate` when playing.
  - Concurrency: `version` counter for optimistic locking; `sequence_number` for event ordering.
- Active Providers in Source:
  - `backend/playback/providers/`: `base.py`, `registry.py`, `deep_link.py`, `youtube_embed.py`.
- Playback Endpoints (`backend/playback/urls.py`):
  - `GET /api/v1/playback/providers/`
  - `GET /api/v1/playback/providers/<provider_id>/`
  - `GET /api/v1/playback/providers/<provider_id>/availability/?content_id=<id>`

### 8.2 Frontend Playback Status
- `/movies/[id]/watch/page.tsx`: An Apple TV-styled presentation placeholder. It queries TMDB metadata via `getMovieDetail(tmdbId)` to display movie title and backdrop, but contains an empty player panel ("Streaming coming soon") with no video element or streaming hook.

---

## 9. Private Rooms

### 9.1 Data Model (`backend/rooms/models.py`)
- `Room`:
  - `room_type`: `'movie'` (MovieFlow Watch) or `'music'` (MovieFlow Listen).
  - `visibility`: `'public'` or `'private'`.
  - `status`: `'waiting'`, `'live'`, `'ended'`, `'cancelled'`.
  - `max_participants`: Positive integer (default 10).
  - `password_hash`: Salted PBKDF2 SHA-256 hash (`salt:hash`), enabling optional room passwords.
- `RoomParticipant`: Tracks active viewers, roles (`host`, `co_host`, `participant`, `viewer`), and status (`joined`, `left`, `removed`).
- `RoomInvitation`: Token-based invitations with recipient binding (`invitee` or `email`) and expiration.

### 9.2 Privacy & Access Enforcement (`backend/rooms/views.py`)
- **Detail Access (`RoomDetailView`):** Public rooms are readable by any authenticated user; private rooms return HTTP 403 unless the requesting user has an active `RoomParticipant` record.
- **Join Access (`RoomJoinView`):** To join a private room, the user must supply a valid, unexpired `invite_token` addressed to their account/email **OR** supply the correct plain password matching `password_hash`.
- **Host Controls:**
  - `POST /api/v1/rooms/<room_id>/end/`: Host-only room termination.
  - `POST /api/v1/rooms/<room_id>/kick/`: Host-only participant expulsion.
  - `POST /api/v1/rooms/<room_id>/invite/`: Issues a secure 32-byte URL-safe invitation token.
- **Invitations:**
  - `GET /api/v1/invitations/<token>/`: Inspects invitation metadata (room name, inviter details, expiration).
  - `POST /api/v1/invitations/<token>/accept/`: Accepts invite and marks status.
  - `POST /api/v1/invitations/<token>/reject/`: Rejects invite.

### 9.3 Frontend Status
- `frontend/src/app/invitations/[token]/page.tsx` is wired to `getInvitationByToken`, `acceptInvitation`, and `rejectInvitation`.
- Creating a room from the dashboard (`frontend/src/app/page.tsx:256`) is a dummy form handler showing a success toast without issuing an HTTP POST to `/api/v1/rooms/`.

---

## 10. Real-time Communication, WebSockets, and Relevant Services

### 10.1 ASGI Application & Routing
- Configuration in `backend/movieflow/asgi.py`:
  ```python
  application = ProtocolTypeRouter({
      "http": django_asgi_app,
      "websocket": JWTQueryAuthMiddleware(
          URLRouter(movieflow.routing.websocket_urlpatterns)
      ),
  })
  ```
- URL Routing (`backend/movieflow/routing.py`):
  1. `ws/health/`: Mounted to `HealthConsumer.as_asgi()`.
  2. `ws/rooms/(?P<room_id>[0-9a-f-]+)/`: Mounted to `RoomPlaybackConsumer.as_asgi()`.

### 10.2 Room Playback Consumer (`backend/rooms/consumers.py`)
- **Protocol:** JSON messages over WebSocket.
- **Handshake Verification:**
  - Reads authenticated user from `scope['user']`.
  - Verifies room exists and is not ended.
  - Enforces private room membership (closes with code 4403 if unauthorized).
  - Enforces capacity limit (`max_participants`, closes with code 4409 if full).
- **Group Management:** Clients join Channel group `room_{room_id}`.
- **Inbound Commands:**
  - `play`, `pause`, `seek` (position in seconds), `change_content`: Restricted to host/co-host; updates `RoomPlaybackState` and broadcasts state changes to the room group.
  - `ping`: Responds immediately with `{"type": "pong"}` for keepalive.
- **Outbound Events:**
  - `state` (initial synchronization packet on join)
  - `play`, `pause`, `seek`, `content_changed`
  - `participant_joined`, `participant_left`
  - `host_changed`, `room_ended`, `error`
- **Volume Policy:** Client volume is local and never transmitted.

### 10.3 Channel Layer & Redis
- In Docker: Redis 7 (`redis:7-alpine`) on `redis://redis:6379/0` using `channels_redis.core.RedisChannelLayer`.
- In Local Dev: Configured via `USE_IN_MEMORY_CHANNELS=True` to use `channels.layers.InMemoryChannelLayer` when Redis is absent.

### 10.4 WebRTC / Voice & Video Infrastructure
- Settings in `backend/movieflow/settings.py`:
  - `LIVEKIT_URL` (default `wss://movieflow-livekit.internal`)
  - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `VOICE_DEFAULT_PROVIDER`
  - `RTC_ICE_SERVERS`: Google STUN (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`) plus optional custom TURN credentials (`TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`).
- Data models: `VoiceSession` and `VoiceParticipant` in `rooms/models.py`.

---

## 11. Ports and Networking

| Component | Container Name | Internal Port | Host Port | Protocol / Transport | Purpose |
|---|---|---|---|---|---|
| Frontend | `movieflow_frontend` | `3000` | `6060` (or `${FRONTEND_PORT:-6060}`) | HTTP | Next.js App Router UI |
| Backend | `movieflow_backend` | `8000` | `8000` (or `${BACKEND_PORT:-8000}`) | HTTP & WS | Daphne ASGI API & WebSockets |
| Database | `movieflow_postgres` | `5432` | `5432` (or `${POSTGRES_PORT:-5432}`) | TCP | PostgreSQL 16 relational database |
| Redis | `movieflow_redis` | `6379` | `6379` (or `${REDIS_PORT:-6379}`) | TCP | Redis 7 Channel layer & cache |

### Network & CORS Details
- **Docker Bridge Network:** `movieflow_net` connects all four services.
- **CORS Allowed Origins (`backend/movieflow/settings.py`):**
  - Default: `http://localhost:6060,http://127.0.0.1:6060` (matching the Docker frontend host port).
  - CSRF Trusted Origins mirror CORS origins.
- **Port Gotcha in Local Development:**
  - Running `npm run dev` in `frontend/` launches Next.js on port `3000`.
  - Unless `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000` or the frontend is launched via `next dev -p 6060`, the local frontend will receive CORS rejections from the backend.

---

## 12. Environment Variables

All secret values have been redacted. Variable names and requirements are cataloged below.

### 12.1 Backend Environment Variables (`backend/.env`, `backend/.env.example`)
| Variable Name | Required | Default / Fallback | Purpose |
|---|---|---|---|
| `DEBUG` | No | `True` | Django debug mode boolean |
| `SECRET_KEY` | **Yes (Prod)** | Insecure dev fallback | Django cryptographic signing key |
| `ALLOWED_HOSTS` | No | `localhost,127.0.0.1,0.0.0.0,backend` | Comma-separated allowed HTTP Host headers |
| `FRONTEND_URL` | No | `http://localhost:6060` | URL used in email links and invitations |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:6060,http://127.0.0.1:6060` | Allowed CORS origins |
| `CORS_ALLOW_ALL_ORIGINS` | No | `False` | Overrides CORS (only active when DEBUG=True) |
| `USE_SQLITE` | No | `False` | Forces SQLite backend if True |
| `DATABASE_URL` | No | Empty | Full PostgreSQL connection URI |
| `DB_NAME` | No | `movieflow_db` | PostgreSQL database name |
| `DB_USER` | No | `movieflow_user` | PostgreSQL username |
| `DB_PASSWORD` | No | `movieflow_pass` | PostgreSQL password |
| `DB_HOST` | No | `localhost` (in Docker: `postgres`) | Database host |
| `DB_PORT` | No | `5432` | Database port |
| `USE_IN_MEMORY_CHANNELS` | No | `False` | Uses InMemoryChannelLayer instead of Redis |
| `REDIS_URL` | No | `redis://localhost:6379/0` | Redis connection URL |
| `JWT_ACCESS_MINUTES` | No | `60` | SimpleJWT access token lifetime |
| `JWT_REFRESH_DAYS` | No | `7` | SimpleJWT refresh token lifetime |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP relay server host |
| `EMAIL_PORT` | No | `587` | SMTP relay port |
| `EMAIL_USE_TLS` | No | `True` | Enable TLS for SMTP |
| `EMAIL_HOST_USER` | No | Empty | SMTP authentication username |
| `EMAIL_HOST_PASSWORD` | No | Empty | SMTP authentication password / app key |
| `DEFAULT_FROM_EMAIL` | No | `MovieFlow <noreply@movieflow.app>` | Sender address on transactional emails |
| `TMDB_API_KEY` | No (for core) | Empty | TMDB v3 API Key |
| `TMDB_READ_ACCESS_TOKEN` | No (for core) | Empty | TMDB v4 Bearer Read Access Token |
| `MUSICBRAINZ_CONTACT_EMAIL` | No | Empty | User-Agent contact for MusicBrainz API |
| `LIVEKIT_URL` | No | `wss://movieflow-livekit.internal` | LiveKit WebRTC server endpoint |
| `LIVEKIT_API_KEY` | No | `devkey` | LiveKit API Key |
| `LIVEKIT_API_SECRET` | No | Dev secret | LiveKit API Secret |
| `VOICE_DEFAULT_PROVIDER` | No | `livekit` | Voice service selector |
| `TURN_SERVER_URL` | No | Empty | Optional TURN server address |
| `TURN_USERNAME` | No | Empty | TURN server credentials |
| `TURN_CREDENTIAL` | No | Empty | TURN server credentials |
| `SECURE_SSL_REDIRECT` | No | `True` (when not DEBUG) | Force HTTPS in production |
| `SECURE_HSTS_SECONDS` | No | `31536000` (when not DEBUG) | HTTP Strict Transport Security duration |
| `SKIP_DAPHNE` | No | `False` | Omit Daphne from installed apps (used in CLI) |
| `UPLOAD_MAX_MOVIE_BYTES` | No | `2147483648` (2 GB) | Movie upload ceiling |
| `UPLOAD_MAX_AUDIO_BYTES` | No | `209715200` (200 MB) | Audio upload ceiling |
| `UPLOAD_MAX_IMAGE_BYTES` | No | `10485760` (10 MB) | Poster upload ceiling |

### 12.2 Frontend Environment Variables (`frontend/.env.local`, `frontend/.env.example`)
| Variable Name | Required | Default / Fallback | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend REST API base URL |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:8000` | Backend WebSocket base URL |
| `NODE_ENV` | No | `development` / `production` | Node execution environment |
| `PORT` | No | `3000` | HTTP listening port for Next.js |
| `HOSTNAME` | No | `0.0.0.0` | Binding interface |

### 12.3 Docker Compose Environment Variables (`.env`, `docker-compose.yml`)
- `COMPOSE_PROJECT_NAME`
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`
- `REDIS_PORT`
- `BACKEND_PORT`
- `FRONTEND_PORT`

---

## 13. Frontend/Backend Start Commands

### 13.1 Backend
- **Development Server (Daphne ASGI — HTTP + WebSocket):**
  ```bash
  daphne -b 0.0.0.0 -p 8000 movieflow.asgi:application
  ```
- **Standard Django Development Server (HTTP only):**
  ```bash
  python backend/manage.py runserver 0.0.0.0:8000
  ```
- **Virtual Environment Invocation (Windows PowerShell):**
  ```powershell
  .\backend\venv\Scripts\python.exe -m daphne -b 0.0.0.0 -p 8000 movieflow.asgi:application
  ```

### 13.2 Frontend
- **Development Server:**
  ```bash
  npm --prefix frontend run dev
  # Or with explicit port matching backend CORS configuration:
  npm --prefix frontend run dev -- -p 6060
  ```
- **Production Server:**
  ```bash
  npm --prefix frontend start
  # Or explicit port:
  npm --prefix frontend start -- -p 6060
  ```

### 13.3 Container Orchestration
- **Docker Compose Start:**
  ```bash
  docker compose up -d
  ```

---

## 14. Build Commands

### 14.1 Backend
- **Database Migrations:**
  ```bash
  python backend/manage.py makemigrations
  python backend/manage.py migrate --noinput
  ```
- **Static Assets Compilation:**
  ```bash
  python backend/manage.py collectstatic --noinput
  ```
- **Test Suite Execution:**
  ```bash
  python backend/manage.py test accounts core friendships notifications entertainment music library rooms playback history administration
  ```

### 14.2 Frontend
- **Production Next.js Build:**
  ```bash
  npm --prefix frontend run build
  ```
- **ESLint Validation:**
  ```bash
  npm --prefix frontend run lint
  ```

### 14.3 Docker Build
- **Rebuild Containers:**
  ```bash
  docker compose build
  ```

---

## 15. API Endpoints Relevant to Monitoring

| Method | Endpoint | Auth Required | Description / Health Signal |
|---|---|---|---|
| `GET` | `/api/core/health/` | **No** | Primary backend health check; executes SQL query `SELECT 1` on database and queries Channel layer instance. Returns 200 OK or 503. |
| `GET` | `/api/health/health/` | **No** | Exact alias of `/api/core/health/`. |
| `WS` | `/ws/health/` | **No** | Channels WebSocket connectivity probe; responds to `{"action":"ping"}` with `{"response":"pong"}` and channel layer type. |
| `GET` | `/api/health` | **No** | Next.js server route returning frontend health status, environment, and configured API/WS URLs. |
| `GET` | `/api/v1/playback/providers/` | Yes | Verifies DRF auth and playback module availability. |
| `GET` | `/api/v1/movies/trending/` | No | Tests outbound TMDB API integration and backend caching layer. |
| `GET` | `/api/v1/music/genres/` | No | Tests outbound MusicBrainz proxy and caching. |
| `WS` | `/ws/rooms/<room_id>/?token=<jwt>`| Yes | Tests room synchronization engine, Redis group fanout, and token validation. |

---

## 16. Health-Check Candidates

### 16.1 Docker Container Healthchecks
1. **PostgreSQL (`movieflow_postgres`):**
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-movieflow_user} -d ${POSTGRES_DB:-movieflow_db}"]
     interval: 5s
     timeout: 5s
     retries: 5
   ```
2. **Redis (`movieflow_redis`):**
   ```yaml
   healthcheck:
     test: ["CMD", "redis-cli", "ping"]
     interval: 5s
     timeout: 5s
     retries: 5
   ```
3. **Backend (`movieflow_backend`):**
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "curl -f http://localhost:8000/api/core/health/ || exit 1"]
     interval: 10s
     timeout: 5s
     retries: 3
     start_period: 15s
   ```
4. **Frontend (`movieflow_frontend`):**
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "node -e 'require(\"http\").get(\"http://localhost:3000/api/health\", (r) => process.exit(r.statusCode === 200 ? 0 : 1))'"]
     interval: 10s
     timeout: 5s
     retries: 3
     start_period: 15s
   ```

### 16.2 Host & AutoHeal Health Probes
- **Liveness Probe:** Periodic HTTP GET to `http://localhost:8000/api/core/health/` and `http://localhost:6060/api/health`.
- **Channels Readiness Probe:** WebSocket connection to `ws://localhost:8000/ws/health/` validating that `{"action":"ping"}` yields `{"response":"pong"}` within 1.5 seconds.

---

## 17. External Dependencies and Services

1. **The Movie Database (TMDB) API:**
   - Documentation: `https://developer.themoviedb.org/docs`
   - Base Endpoints: `https://api.themoviedb.org/3`, `https://image.tmdb.org/t/p`
   - Credentials: `TMDB_API_KEY`, `TMDB_READ_ACCESS_TOKEN`.
   - Used for: Movie/TV search, popular lists, trending lists, metadata, and poster images.
2. **MusicBrainz & Cover Art Archive:**
   - Base Endpoints: `https://musicbrainz.org/ws/2`, `https://coverartarchive.org`
   - Config: `MUSICBRAINZ_USER_AGENT`, `MUSICBRAINZ_CONTACT_EMAIL`.
   - Used for: Open music metadata lookup, releases, artist discographies, album cover art.
3. **LiveKit SFU (WebRTC Audio/Video):**
   - Endpoints: `LIVEKIT_URL` (e.g. `wss://movieflow-livekit.internal`)
   - Credentials: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
   - Used for: Group voice calling in rooms.
4. **STUN / TURN Servers:**
   - Public STUN: Google STUN (`stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302`).
   - Optional TURN: Configured via `TURN_SERVER_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.
5. **SMTP Mail Server:**
   - Supported Relays: Gmail, SendGrid, Amazon SES via TLS on port 587.
   - Used for: User registration verification emails, password resets, room invitations.
   - Local fallback: Outputs to console when `DEBUG=True` and credentials are blank.

---

## 18. Existing Deployment Architecture

The current deployment is orchestrated via `docker-compose.yml`:
- **Network:** Single custom bridge network `movieflow_net`.
- **Postgres Service:**
  - Image: `postgres:16-alpine`
  - Persistent volume: `postgres_data:/var/lib/postgresql/data`
  - Active healthcheck with `pg_isready`
- **Redis Service:**
  - Image: `redis:7-alpine`
  - Persistent volume: `redis_data:/data`
  - Active healthcheck with `redis-cli ping`
- **Backend Service:**
  - Built from `./backend/Dockerfile`
  - Command: Runs migrations automatically on boot, then starts Daphne ASGI:
    `sh -c "python manage.py migrate --noinput && daphne -b 0.0.0.0 -p 8000 movieflow.asgi:application"`
  - Depends on `postgres` and `redis` with `condition: service_healthy`
  - Mounted volumes: `./backend:/app` (live code mount for development), `static_volume:/app/staticfiles`, `media_volume:/app/media`
- **Frontend Service:**
  - Built from `./frontend/Dockerfile`
  - Build arguments: `NEXT_PUBLIC_API_URL: http://localhost:8000`, `NEXT_PUBLIC_WS_URL: ws://localhost:8000`
  - Port mapping: `6060:3000`
  - Depends on `backend`

---

## 19. Dockerization Recommendations for Phase 3

1. **Multi-Stage Next.js Build with Standalone Output:**
   - Update `frontend/next.config.mjs` to enable `output: 'standalone'`.
   - Refactor `frontend/Dockerfile` into three stages (`deps`, `builder`, `runner`).
   - Copy only the standalone output and public directory into the final `runner` stage, eliminating `node_modules` from the production image and reducing image size from ~1.2 GB to ~120 MB.
2. **Multi-Stage Python Wheel Build:**
   - Current `backend/Dockerfile` installs `build-essential` and `libpq-dev` into the final image.
   - Refactor to a `builder` stage that compiles wheels, copying only the pre-compiled wheels and runtime `libpq5` into the final `python:3.11-slim` runner stage.
3. **Non-Root Container Users:**
   - In `backend/Dockerfile`, create a dedicated non-root user (e.g. `useradd -m movieflow`) and configure permissions for `/app/media` and `/app/staticfiles`.
   - In `frontend/Dockerfile`, run as `USER nextjs:nodejs`.
4. **Explicit Healthchecks in Docker Compose:**
   - Add native `healthcheck` declarations to `backend` and `frontend` in `docker-compose.yml` so that orchestrators can verify readiness before routing traffic.
5. **Harmonize Port & CORS Configuration:**
   - Ensure `FRONTEND_PORT` (6060) is consistent across all compose definitions, CORS origins, and Next.js client environment variables.
6. **Separate Database Migration Execution:**
   - Avoid executing `manage.py migrate` directly in the backend container startup command if multiple backend replicas are deployed in the future (prevents migration race conditions). Use an initialization container or pre-start hook.
7. **Volume Permissions & Persistence:**
   - Ensure the named volume `media_volume` is given proper UID/GID ownership so uploads succeed under non-root users.

---

## 20. Monitoring & Automated Recovery Recommendations for Future Phases

1. **AutoHeal Dual-Probe Architecture:**
   - **Liveness Probe (Every 10s):** Query `GET /api/core/health/` and `GET /api/health`. If either endpoint fails 3 consecutive times, trigger an automated container restart.
   - **Readiness Probe (Every 30s):** Verify sub-components (Postgres cursor execution, Redis channel layer ping, TMDB outbound proxy). If degraded, log an alert and avoid directing user sessions.
2. **WebSocket & Channel Layer Watchdog:**
   - Periodic WebSocket connection test to `/ws/health/` sending a ping action. Daphne processes can occasionally hang or drop worker channels while continuing to respond to basic HTTP requests. A dedicated WebSocket probe ensures ASGI worker threads are active.
3. **Deadlock & Slow Query Monitoring:**
   - PostgreSQL connection count monitoring and query execution timeouts.
4. **Structured JSON Logging:**
   - Configure Python `logging` dict in `settings.py` to output structured JSON logs to `stdout`/`stderr`.
   - Include correlation IDs (e.g., `request_id`, `user_id`, `room_id`) across REST requests and WebSocket frames to facilitate automated log analysis.
5. **Automated Recovery Policies:**
   - Unhealthy Database -> Restart PostgreSQL container, wait for `pg_isready`, reload backend connection pools.
   - Unhealthy Redis -> Restart Redis container, reconnect Channels layer.
   - Unhealthy Daphne / Backend -> Graceful worker reload or container restart.

---

## 21. Unknowns and Items Requiring Confirmation

1. **LiveKit Server Presence:**
   - Settings define `LIVEKIT_URL = 'wss://movieflow-livekit.internal'`, but no LiveKit container or service exists in `docker-compose.yml`. Confirmation is needed on whether a LiveKit SFU service should be containerized in Phase 3.
2. **Production Media Serving Solution:**
   - `DEBUG=False` disables Django's static/media view. A decision is required on whether production media will be served via an Nginx reverse proxy sidecar, WhiteNoise, or an external object store (e.g. MinIO/S3).
3. **Frontend Scope for Rooms & Uploads:**
   - The backend contains functioning models, APIs, and WebSockets for personal uploads and watch rooms, but the frontend lacks matching pages/components. Confirmation is needed on whether Phase 3 includes building these frontend pages or focusing purely on containerization of the existing code.
4. **Administration API Gap:**
   - Frontend contains complete admin UI pages (`/admin`, `/admin/users`, `/admin/moderation`, `/admin/analytics`) calling `/api/v1/admin/*`, but the backend `administration` app does not mount any `urls.py`. Confirmation is needed on whether the admin API will be implemented or disabled.

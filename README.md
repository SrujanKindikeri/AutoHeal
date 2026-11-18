# MovieFlow — Watch Together. Listen Together.

MovieFlow is a premium Apple-inspired social entertainment platform that combines movie streaming experiences, music listening, synchronized watch parties, social networking, and FaceTime-style communication.

---

## Architecture Overview (Phases 1, 2, 3 & 4 Complete)

```
MultiFlow/
├── backend/                  # Python 3.11 + Django 5.1 + Channels 4 (Daphne ASGI)
│   ├── accounts/             # Phase 2: Custom User, MovieFlow ID, JWT Auth, Profiles, Security
│   │   ├── models.py         # User, UserProfile, EmailVerificationToken, PasswordResetToken, AuditLog
│   │   ├── managers.py       # Custom UserManager with auto MovieFlow ID generator
│   │   ├── utils.py          # Cryptographic MovieFlow ID (MF-XXXXXXXX) generator & email dispatch
│   │   ├── services.py       # Verification & reset business logic, audit logging
│   │   ├── serializers.py    # Strict DRF serializers (Register, Login, Profile, PublicUser)
│   │   ├── views.py          # Auth endpoints, JWT issuance/refresh/logout, profile & search
│   │   ├── urls.py           # API routes mounted at /api/v1/auth/ and /api/v1/profile/
│   │   └── tests.py          # 19 automated tests covering all Phase 2 requirements
│   ├── friendships/          # Phase 3: Friendships, Requests, User Discovery & Blocking
│   │   ├── models.py         # Friendship (canonical ordering user1 < user2), FriendRequest, UserBlock
│   │   ├── services.py       # Transactional request creation, reciprocal auto-acceptance, block cleanup
│   │   ├── serializers.py    # SocialUserSerializer, FriendRequestSerializer, FriendshipSerializer, UserBlockSerializer
│   │   ├── views.py          # Friends, incoming/outgoing requests, search, user detail, block/unblock
│   │   ├── urls.py           # API routes mounted at /api/v1/friends/ and /api/v1/users/
│   │   └── tests.py          # 14 automated tests covering friendship lifecycle and edge cases
│   ├── notifications/        # Phase 3: In-app real-time notification engine
│   │   ├── models.py         # Notification model (actor, recipient, verb, data, read status)
│   │   ├── serializers.py    # NotificationSerializer with actor public card
│   │   ├── views.py          # Notification listing, individual read patch, read-all batch
│   │   └── urls.py           # API routes mounted at /api/v1/notifications/
│   ├── core/                 # Health check, WebSocket consumers, system routing
│   ├── movieflow/            # Settings, ASGI, WSGI, URL routing
│   ├── Dockerfile            # Production & dev Docker image
│   └── manage.py             # Django management CLI
├── frontend/                 # Next.js 14 + React 18 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      # /: Phase 4 Apple TV & Music Cinematic Home Dashboard
│   │   │   ├── register/     # /register: Apple-styled registration with password meter
│   │   │   ├── login/        # /login: Email/Username login with unverified account gates
│   │   │   ├── verify-email/ # /verify-email: Token validation and resend flow
│   │   │   ├── forgot-password/ # /forgot-password: User enumeration-safe password reset request
│   │   │   ├── reset-password/  # /reset-password: Password recovery confirmation
│   │   │   ├── complete-profile/# /complete-profile: Genre selection and onboarding tracker
│   │   │   ├── profile/      # /profile: Identity card, copyable MovieFlow ID, interests
│   │   │   ├── friends/      # /friends: Social hub (Friends, Discovery, Requests, Blocked)
│   │   │   └── settings/account/ # /settings/account: Password change & social privacy controls
│   │   ├── components/
│   │   │   ├── ui/           # Phase 4 Reusable Design System Library (18 components)
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── IconButton.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── Avatar.tsx
│   │   │   │   ├── AvatarGroup.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Tooltip.tsx
│   │   │   │   ├── Dropdown.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Drawer.tsx
│   │   │   │   ├── Tabs.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   ├── Skeleton.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── MediaCard.tsx
│   │   │   │   ├── SectionHeader.tsx
│   │   │   │   ├── GlassPanel.tsx
│   │   │   │   ├── NavigationItem.tsx
│   │   │   │   └── index.ts
│   │   │   ├── navigation/   # Phase 4 Application Navigation
│   │   │   │   ├── DesktopSidebar.tsx  # Sleek desktop sidebar (Discover, Social, Library, Account)
│   │   │   │   ├── MobileNavigation.tsx # Bottom bar + slide-over drawer
│   │   │   │   ├── AppHeader.tsx        # Top slim search & notifications header
│   │   │   │   └── AppShell.tsx         # Responsive master application shell
│   │   │   ├── navbar.tsx    # Standalone navigation bar
│   │   │   └── providers.tsx # QueryClient and ToastProvider
│   │   ├── types/            # TypeScript interfaces (auth.ts, social.ts)
│   │   ├── store/            # Zustand auth state store (persisted tokens, reactive auth)
│   │   └── lib/              # API clients (api.ts, authApi.ts, socialApi.ts)
│   ├── docker-compose.yml    # Orchestration for PostgreSQL 16, Redis 7, Backend & Frontend
│   ├── verify_phase1.py      # Phase 1 multi-service regression test suite
│   ├── verify_phase2.py      # Phase 2 end-to-end authentication & identity verification suite
│   └── verify_phase3.py      # Phase 3 end-to-end social networking, discovery & friendship verification
```

---

## Phase 4 Design System & Dashboard

### 1. Reusable Component Library (`frontend/src/components/ui/`)
- **`Button`**: Apple-styled pill buttons with primary, secondary, glass, subtle, and danger variants.
- **`IconButton`**: Accessible button with `aria-label`, tooltip integration, and active micro-scaling.
- **`Input`**: Accessible input with validation states, prefix/suffix icons, and Apple focus rings.
- **`SearchBar`**: Apple TV-style search with shortcut hints (`⌘K`), clear buttons, and loading states.
- **`Avatar` & `AvatarGroup`**: High-resolution image avatars with gradient fallback initials and stacked groups.
- **`Badge`**: Semantic badges for status indicators (accent, success, warning, danger, glass, purple, gold).
- **`Tooltip`**: Accessible hover/focus tooltips with fade transitions.
- **`Dropdown`**: Glass menus with keyboard navigation and Escape dismissal.
- **`Modal`**: Accessible dialogs with backdrop blur, focus trap, and keyboard accessibility.
- **`Drawer`**: Slide-over panels from right or bottom for mobile menus and responsive trays.
- **`Tabs`**: ARIA-compliant tab lists with animated active pills.
- **`Toast`**: Context-based notification dispatcher supporting success, error, warning, and info.
- **`Skeleton`**: Pulsing loading placeholders for text, media cards, and circular avatars.
- **`EmptyState`**: Content-aware empty states with action CTAs.
- **`MediaCard`**: High-resolution movie and music artwork cards with hover controls and metadata.
- **`SectionHeader`**: Clean section titles with subtitles, icons, and action links.
- **`GlassPanel`**: Restrained Liquid Glass surfaces (subtle, card, elevated, interactive).
- **`NavigationItem`**: Navigation link with active indicators and notification badges.

### 2. Application Navigation (`frontend/src/components/navigation/`)
- **Desktop Sidebar**:
  - Discover: Home, Movies, Music, Watch Together, Listen Together
  - Social: Friends (with pending request badge), Notifications (with unread badge)
  - Library: Watchlist, Playlists
  - Account Card: Avatar, username, MovieFlow ID with one-click copy, Settings, Sign Out
- **Mobile Navigation**:
  - Bottom navigation bar: Home, Movies, Music, Friends, More
  - Drawer menu for secondary destinations with safe-area spacing
- **AppHeader**:
  - Slim glass top header with search trigger, notifications dropdown, and quick user menu

### 3. Home Dashboard (`/`)
- Dynamic time-of-day greeting ("Good evening, [Name]") with MovieFlow ID.
- Cinematic Apple TV spotlight feature with 4K HDR badges, synopsis, and action buttons.
- Quick actions bar: "Start Watch Party", "Start Listening Room", "Find Friends".
- Social activity integration with real friends and pending requests from Phase 3.
- Popular movies and trending series with interactive `MediaCard` components.
- Curated music recommendations with lossless audio badges.
- Genuine empty states for Continue Watching, Recently Played, and Upcoming Rooms.
- System Diagnostics modal providing live health checks.

---

## Test Execution

### 1. Run Complete Backend Regression Test Suite (35 tests):
```bash
.\backend\venv\Scripts\python.exe backend\manage.py test accounts core friendships
```

### 2. Run Phase 3 Multi-Service Verification Suite (8/8 stages):
```bash
.\backend\venv\Scripts\python.exe verify_phase3.py
```

### 3. Run Phase 2 Authentication & Identity Verification Suite (7/7 stages):
```bash
.\backend\venv\Scripts\python.exe verify_phase2.py
```

### 4. Run Phase 1 Foundation Verification Suite (4/4 stages):
```bash
.\backend\venv\Scripts\python.exe verify_phase1.py
```

### 5. Frontend Production Build Check:
```bash
npm --prefix frontend run build
```

---

## Phase 5 — Movie & TV Discovery

### Overview

Phase 5 adds full TMDB-powered movie and TV discovery to MovieFlow. All metadata is fetched server-side through the Django backend; no API secrets are ever sent to the browser.

### Setup

1. **Get TMDB credentials** — Create a free account at [https://developer.themoviedb.org/docs/getting-started](https://developer.themoviedb.org/docs/getting-started) and generate an API Key and a Read Access Token.

2. **Add credentials to `backend/.env`**:
   ```env
   TMDB_API_KEY=your_tmdb_api_key_here
   TMDB_READ_ACCESS_TOKEN=your_tmdb_read_access_token_here
   ```

3. **Run migrations**:
   ```bash
   .\backend\venv\Scripts\python.exe backend\manage.py migrate
   ```

4. **Restart the backend** (Daphne or `runserver`).

> **TMDB Attribution:** This product uses the TMDB API but is not endorsed or certified by TMDB.

### Cache Behavior

Responses are cached with per-endpoint TTLs. When `REDIS_URL` is configured the Django cache backend is Redis; otherwise Django's local-memory cache is used as a fallback. No external request is made for a resource that is already in the cache within its TTL window.

### API Endpoints (Phase 5)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/movies/trending/` | Trending movies (day/week) |
| GET | `/api/v1/movies/popular/` | Popular movies |
| GET | `/api/v1/movies/top-rated/` | Top-rated movies |
| GET | `/api/v1/movies/now-playing/` | Now-playing movies |
| GET | `/api/v1/movies/upcoming/` | Upcoming releases |
| GET | `/api/v1/movies/{movie_id}/` | Movie detail by TMDB ID |
| GET | `/api/v1/tv/trending/` | Trending TV shows (day/week) |
| GET | `/api/v1/tv/popular/` | Popular TV shows |
| GET | `/api/v1/tv/top-rated/` | Top-rated TV shows |
| GET | `/api/v1/tv/on-the-air/` | Currently airing shows |
| GET | `/api/v1/tv/{show_id}/` | TV show detail by TMDB ID |
| GET | `/api/v1/entertainment/search/` | Multi-search (movies + TV, min 2 chars) |
| GET | `/api/v1/entertainment/genres/` | Genre list (movies and TV) |
| GET | `/api/v1/entertainment/discover/` | Filtered/sorted discovery feed |
| GET | `/api/v1/watchlist/` | Current user's watchlist (auth required) |
| POST | `/api/v1/watchlist/` | Add item to watchlist (auth required) |
| DELETE | `/api/v1/watchlist/{id}/` | Remove item from watchlist (auth required) |

### Frontend Pages (Phase 5)

| Route | File |
|-------|------|
| `/movies` | `src/app/movies/page.tsx` |
| `/movies/trending` | `src/app/movies/trending/page.tsx` |
| `/movies/popular` | `src/app/movies/popular/page.tsx` |
| `/movies/top-rated` | `src/app/movies/top-rated/page.tsx` |
| `/movies/upcoming` | `src/app/movies/upcoming/page.tsx` |
| `/movies/[id]` | `src/app/movies/[id]/page.tsx` |
| `/shows` | `src/app/shows/page.tsx` |
| `/shows/[id]` | `src/app/shows/[id]/page.tsx` |
| `/search` | `src/app/search/page.tsx` |

### Known Limitations

- Four advisory ESLint warnings remain (no build impact): two `<img>` vs `<Image />` warnings in `complete-profile/page.tsx` and `profile/page.tsx`, one missing `verified` dependency in `verify-email/page.tsx`, and one missing `fetchSocialCounts` dependency in `AppShell.tsx`.
- Playback is not available in Phase 5; detail pages show a clearly labelled coming-soon state.
- Adult content is excluded from all discovery and search responses by default (`include_adult=false` is always passed to TMDB).

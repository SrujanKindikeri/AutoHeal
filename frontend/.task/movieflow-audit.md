# MovieFlow Frontend — State & Contrast Audit

Scope: read-only audit of the MovieFlow frontend in the `white-ui-redesign` worktree.
Root audited: `c:\Users\kindi\OneDrive\Documents\MultiFlow\.worktrees\white-ui-redesign\frontend`
No application code was modified.

---

## 1. Headline finding (read this first)

The frontend is in a **half-migrated state** and contains **reproducible invisible-text bugs**:

1. **Two color systems disagree.** `tailwind.config.ts` defines semantic tokens (`surface.background`, `content.primary`, `border.subtle` …) hard‑coded to **dark** values (`#08080a`, `#f5f5f7`, `rgba(255,255,255,0.06)`). `globals.css` defines **white** CSS variables (`--background:#FFFFFF`, `--foreground:#1D1D1F` …) — but those variables are **never consumed**. The Tailwind semantic tokens and the CSS variables are not wired together; the CSS variables are effectively dead.

2. **The root layout forces a dark theme.** `src/app/layout.tsx` sets `<html className="dark">` and `<body className="… bg-[#08080a] text-[#f5f5f7] …">`. So the whole app renders dark by default.

3. **The `dark` class is inert.** There is **no `dark:` variant usage anywhere** in the codebase (0 matches for `dark:(bg|text|border)`), no `darkMode` key in `tailwind.config.ts`, no `next-themes`, no `ThemeProvider`, no `data-theme`, no `prefers-color-scheme`. Tailwind's dark-mode system is unused; all theming is via hard-coded colors and the dark-valued semantic tokens.

4. **The `apple-glass*` CSS classes are already white** (`#FFFFFF` / `rgba(255,255,255,0.9)`), but they are paired with `text-white` / `text-content-primary` (`#f5f5f7`, near‑white). White text on a white glass surface = **invisible**. This is the core contrast defect the redesign must fix. The clearest instance: the auth pages (`/login`, `/register`, …) render a `bg-white` body with the legacy `Navbar` (white glass + `text-white`), so the entire navbar text is white‑on‑white.

5. The redesign therefore has two layers of work: (a) re-point the semantic token layer at white/light values, and (b) remove the ~390 `text-white` / ~182 `bg-white/[…]` translucent dark‑theme utilities that only read correctly on a dark surface.

---

## 2. Build, stack & tooling

From `package.json`:

- **Framework:** Next.js `^14.2.18` (App Router), React `^18.3.1`, TypeScript `^5.6.3`.
- **Styling:** Tailwind CSS `^3.4.14` (JS config, PostCSS+autoprefixer). **Not** Tailwind v4 — this differs from the LifeFlow reference design system (`.task/lifeflow-design-system.md`), which uses Tailwind v4 CSS‑based config.
- **State/data:** Zustand `^5.0.1`, `@tanstack/react-query` `^5.59.16`.
- **UI libs:** `framer-motion ^11.11.11`, `lucide-react ^0.454.0`, `clsx`, `tailwind-merge`. `@dnd-kit/*` for drag‑and‑drop.
- **No theme library:** `next-themes` is **not** a dependency. No `ThemeProvider`/`useTheme`/`data-theme`/`prefers-color-scheme` references exist in the source.
- **No shadcn/ui:** there is **no `components.json`** anywhere under the frontend. The `src/components/ui/*` components are hand‑rolled, not shadcn-generated.
- Scripts: `dev` (`next dev -p 3000`), `build` (`next build`), `start`, `lint` (`next lint`). No test runner is configured — there are no test scripts and no test files in the frontend tree.

Build/test commands:
- Build: `npm run build` (run from `…\white-ui-redesign\frontend`).
- Lint: `npm run lint`.
- (No unit tests exist for this frontend.)

---

## 3. Theme architecture

### 3.1 `tailwind.config.ts` (full config summary)

- `content`: `./src/pages/**`, `./src/components/**`, `./src/app/**`.
- **No `darkMode` key** → Tailwind v3 defaults to `media`, but irrelevant since no `dark:` classes exist.
- `theme.extend.colors` defines the palette. All semantic tokens are hard‑coded to **dark** values:

  | Token group | Key | Value |
  |---|---|---|
  | `surface` | `background` | `#08080a` (near‑black) |
  | | `primary` | `#0f0f14` |
  | | `secondary` | `#16161f` |
  | | `elevated` | `#1e1e2a` |
  | | `glass` | `rgba(18,18,24,0.72)` |
  | | `glass-hover` | `rgba(25,25,34,0.85)` |
  | | `glass-card` | `rgba(22,22,30,0.55)` |
  | `border` | `subtle` | `rgba(255,255,255,0.06)` |
  | | `glass` | `rgba(255,255,255,0.09)` |
  | | `strong` | `rgba(255,255,255,0.16)` |
  | | `focus` | `#2997ff` |
  | `content` | `primary` | `#f5f5f7` (near‑white) |
  | | `secondary` | `rgba(245,245,247,0.75)` |
  | | `muted` | `rgba(245,245,247,0.45)` |
  | | `inverse` | `#08080a` |
  | `accent` | `blue`/`blue-hover` | `#2997ff` / `#0071e3` |
  | | `purple`/`purple-hover` | `#bf5af2` / `#a838eb` |
  | | `pink` / `gold` / `emerald` / `coral` | `#ff375f` / `#ffd60a` / `#30d158` / `#ff453a` |
  | `mf` (legacy shorthands) | `dark` `#08080a`, `card` `#121217`, `subtle` `#1c1c24`, `border` `rgba(255,255,255,0.08)`, `accent`/`accent-hover`/`gold`/`purple` | mirrors the above |

- `fontFamily.sans`: Apple system stack (`-apple-system`, `SF Pro Display`, …, `Segoe UI`, `Roboto`). `mono`: `SF Mono` / `ui-monospace` / `Consolas` etc.
- Custom `fontSize` scale: `display-2xl … caption`.
- `boxShadow`: `glass`, `glass-elevated`, `glow-blue`, `glow-purple` (all dark‑mode shadows, e.g. `0 8px 32px 0 rgba(0,0,0,0.37)`).
- `backdropBlur`: `xs 2px`, `glass 20px`.
- `animation`/`keyframes`: `fade-in`, `scale-in`, `slide-up`.
- `plugins: []`.

### 3.2 `src/app/globals.css` (all CSS variables & utility classes)

`:root` (the only variable block — there is **no `.dark`/`[data-theme=dark]` override**):

| Variable | Value |
|---|---|
| `--background` | `#FFFFFF` |
| `--foreground` | `#1D1D1F` |
| `--surface-primary` | `#F5F5F7` |
| `--surface-secondary` | `#F5F5F7` |
| `--surface-elevated` | `#FFFFFF` |
| `--surface-glass` | `rgba(255,255,255,0.85)` |
| `--border-subtle` | `#D2D2D7` |
| `--border-glass` | `#D2D2D7` |
| `--accent-blue` | `#0071E3` |
| `--accent-purple` | `#bf5af2` |
| `--accent-pink` | `#ff375f` |
| `--status-success` | `#30d158` |
| `--status-warning` | `#ffd60a` |
| `--status-error` | `#ff453a` |

- `body`: `color:#1D1D1F; background:#FFFFFF;` (Apple font stack). **Note:** this is overridden in practice by `layout.tsx`'s body Tailwind classes `bg-[#08080a] text-[#f5f5f7]`, so the rendered body is dark except where pages add their own `bg-white` wrapper.
- `:focus-visible`: `outline: 2px solid var(--accent-blue)`.
- The **white glass classes** (these are the surfaces that break against white/near‑white text):
  - `.apple-glass-card` → `background:#FFFFFF; border:1px solid #D2D2D7; box-shadow …` (opaque white)
  - `.apple-glass` → `background:rgba(255,255,255,0.9); backdrop-filter:blur(20px); border:1px solid #D2D2D7`
  - `.apple-glass-elevated` → `background:#FFFFFF; border:1px solid #D2D2D7; …` (opaque white)
  - `.apple-button` → `background:rgba(0,0,0,0.04); border:1px solid #D2D2D7`
- `prefers-reduced-motion` block, custom thin scrollbars (dark‑themed: `rgba(0,0,0,0.15)`), `.no-scrollbar`.

**Key gap:** these CSS variables are **not referenced by Tailwind tokens and not consumed by components**. A search for `var(--foreground)`/`var(--background)` in component code returns **zero** usages. Components use Tailwind semantic tokens (`text-content-primary`, `bg-surface-background`, …) which resolve to the dark `tailwind.config.ts` values. So `globals.css`'s white variables and the `apple-glass*` white classes are the only "white" parts of the system; everything keyed off Tailwind tokens is dark.

### 3.3 Theme provider / next-themes / shadcn

- `src/components/providers.tsx` wraps only `QueryClientProvider` + `ToastProvider`. **No theme provider.**
- `package.json` has **no `next-themes`**.
- **No `components.json`** → not a shadcn/ui project. `src/components/ui/*` are custom components.

---

## 4. Root layout

`src/app/layout.tsx`:
```tsx
<html lang="en" className="dark">
  <body className="min-h-screen bg-[#08080a] text-[#f5f5f7] antialiased selection:bg-[#2997ff]/30 selection:text-white">
    <Providers>{children}</Providers>
  </body>
</html>
```
- Forces dark body + `className="dark"` (inert — no `dark:` variants exist).
- `metadata`: title "MovieFlow — Watch Together. Listen Together.", description present.

---

## 5. Navigation architecture (two coexisting systems)

There are **two navigation systems** in the repo, used by different routes:

### 5.1 Legacy `Navbar` — `src/components/navbar.tsx`
- Sticky header using `apple-glass` (white glass) with **`text-white`** brand/links/dropdowns, `border-white/[0.08]`, `bg-white/[0.1]` active pills, `apple-button`, `apple-glass-card` dropdowns.
- Center nav links: Home, Movies, Music, Friends, Profile.
- Right side: notification bell dropdown + user dropdown (or Sign In / Get Started when logged out).
- 25 `text-white` usages. On a white page this is **white text on white glass = invisible**.

### 5.2 New `AppShell` system — `src/components/navigation/`
- `AppShell.tsx`: full layout — left `DesktopSidebar` (fixed `w-64`), top `AppHeader`, content `<main>`, bottom `MobileNavigation`, plus a system‑diagnostics `Modal`. Root `div` uses `bg-surface-background text-content-primary` (dark tokens → dark).
- `AppHeader.tsx`: sticky top bar with search `SearchBar`, notification dropdown, user `Dropdown`/`Avatar`. Uses `apple-glass-elevated` (white) for the notification dropdown but `text-content-primary` (#f5f5f7) for its headings → low contrast on the white surface.
- `DesktopSidebar.tsx`: fixed sidebar with brand, Discover/Social/Library groups via `NavigationItem`, identity card. Uses semantic tokens (`bg-surface-primary/95`, `text-content-primary`, `border-border-subtle`).
- `MobileNavigation.tsx`: fixed bottom glass bar (`apple-glass-elevated` + `border-border-strong`) + right `Drawer` for secondary destinations. Uses `text-content-muted`/`text-content-primary`.

### 5.3 Which pages use which
| Nav system | Pages |
|---|---|
| `Navbar` (legacy) | `/login`, `/register` (and `/signup` re‑export), `/forgot-password`, `/reset-password`, `/verify-email`, `/email-verification-success`, `/invitations/[token]`, `/complete-profile` |
| `AppShell` (new) | `/` (home), `/friends`, `/library` (+ `/library/collections`, `/favorites`, `/movies`, `/music`, `/shows`, `/collections/[id]`), `/movies` (+ `/popular`, `/top-rated`, `/trending`, `/upcoming`, `/[id]`), `/music` (+ `/genres`, `/new-releases`, `/search`, `/trending`, `/album/[id]`, `/artist/[id]`, `/track/[id]`), `/playlists` (+ `/create`, `/discover`, `/[id]`, `/[id]/edit`), `/search`, `/shows` (+ `/[id]`), `/profile`, `/settings/account` |
| Neither | `/signup` (re‑exports `/register`) |

**Body background per page (page‑level wrapper):**
- White pages (`bg-white text-[#1D1D1F]`) using `Navbar`: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `email-verification-success`, `invitations/[token]`. → **Navbar text-white on white = invisible.**
- Dark loading wrapper (`bg-[#08080a] text-white`): `complete-profile` (line 138), `profile` (loading state), `settings/account` (line 124). → dark flash; on a white theme these full‑screen loaders would be jarring/black.
- AppShell pages: no page‑level bg wrapper; they inherit the dark root body + AppShell's `bg-surface-background` (#08080a).

### 5.4 Dangling navigation links (will 404)
`DesktopSidebar` and `MobileNavigation` link to routes that **do not exist** as pages in this worktree:
- `/watch-together`, `/listen-together`, `/watchlist` — confirmed absent (no `page.tsx`).
- `/for-you` also absent (not linked but referenced in related worktrees).
Only API route present: `/api/health` (`src/app/api/health/route.ts`).

---

## 6. Full route inventory (App Router, `src/app/`)

| Route | File | Nav | Notes |
|---|---|---|---|
| `/` | `page.tsx` | AppShell | Home/discovery hero + rows |
| `/complete-profile` | `complete-profile/page.tsx` | Navbar | dark loader `bg-#08080a` |
| `/email-verification-success` | `email-verification-success/page.tsx` | Navbar | `bg-white` |
| `/forgot-password` | `forgot-password/page.tsx` | Navbar | `bg-white` |
| `/friends` | `friends/page.tsx` | AppShell | heaviest `text-white` user (81) |
| `/invitations/[token]` | `invitations/[token]/page.tsx` | Navbar | `bg-white` |
| `/library` | `library/page.tsx` | AppShell | `library/layout.tsx` = pass‑through |
| `/library/collections` | `library/collections/page.tsx` | AppShell | |
| `/library/collections/[id]` | `library/collections/[id]/page.tsx` | (none imported) | |
| `/library/favorites` | `library/favorites/page.tsx` | AppShell | |
| `/library/movies` | `library/movies/page.tsx` | AppShell | |
| `/library/music` | `library/music/page.tsx` | AppShell | |
| `/library/shows` | `library/shows/page.tsx` | AppShell | |
| `/login` | `login/page.tsx` | Navbar | `bg-white` |
| `/movies` | `movies/page.tsx` | AppShell | `movies/layout.tsx` = pass‑through |
| `/movies/popular` | `movies/popular/page.tsx` | AppShell | |
| `/movies/top-rated` | `movies/top-rated/page.tsx` | AppShell | |
| `/movies/trending` | `movies/trending/page.tsx` | AppShell | |
| `/movies/upcoming` | `movies/upcoming/page.tsx` | AppShell | |
| `/movies/[id]` | `movies/[id]/page.tsx` | (none imported) | detail |
| `/music` | `music/page.tsx` | AppShell | |
| `/music/album/[id]` | `music/album/[id]/page.tsx` | (none imported) | |
| `/music/artist/[id]` | `music/artist/[id]/page.tsx` | (none imported) | |
| `/music/genres` | `music/genres/page.tsx` | AppShell | |
| `/music/new-releases` | `music/new-releases/page.tsx` | AppShell | |
| `/music/search` | `music/search/page.tsx` | AppShell | |
| `/music/track/[id]` | `music/track/[id]/page.tsx` | (none imported) | |
| `/music/trending` | `music/trending/page.tsx` | AppShell | |
| `/playlists` | `playlists/page.tsx` | AppShell | |
| `/playlists/create` | `playlists/create/page.tsx` | AppShell | |
| `/playlists/discover` | `playlists/discover/page.tsx` | AppShell | |
| `/playlists/[id]` | `playlists/[id]/page.tsx` | (none imported) | |
| `/playlists/[id]/edit` | `playlists/[id]/edit/page.tsx` | (none imported) | |
| `/profile` | `profile/page.tsx` | AppShell | dark loader |
| `/register` | `register/page.tsx` | Navbar | `bg-white` |
| `/reset-password` | `reset-password/page.tsx` | Navbar | `bg-white` |
| `/search` | `search/page.tsx` + `search/SearchContent.tsx` | AppShell | |
| `/settings/account` | `settings/account/page.tsx` | AppShell | dark loader + dark `<option>` bg |
| `/shows` | `shows/page.tsx` | AppShell | `shows/layout.tsx` = pass‑through |
| `/shows/[id]` | `shows/[id]/page.tsx` | (none imported) | detail |
| `/signup` | `signup/page.tsx` | — | re‑exports `register` (`export { default } from '../register/page'`) |
| `/verify-email` | `verify-email/page.tsx` | Navbar | `bg-white` |
| `/api/health` | `api/health/route.ts` | — | API route (not a page) |

Layout files: `src/app/layout.tsx` (root), `library/layout.tsx`, `movies/layout.tsx`, `shows/layout.tsx` (all three are metadata-only pass‑throughs returning `<>{children}</>`). `middleware.ts` present at `src/middleware.ts`.

---

## 7. Component inventory (`src/components/`)

### 7.1 `src/components/ui/` (shared primitives, barrel `index.ts`)
`Avatar`, `AvatarGroup`, `Badge`, `Button`, `Drawer`, `Dropdown`, `EmptyState`, `GlassPanel`, `IconButton`, `Input`, `MediaCard`, `Modal`, `NavigationItem`, `SearchBar`, `SectionHeader`, `Skeleton`, `Tabs`, `Toast`, `Tooltip`. (`index.ts` re‑exports all of these.)

Theming notes for the most‑used primitives:
- **Button.tsx**: variants `primary|secondary|glass|subtle|danger|ghost`, sizes `sm|md|lg`. Uses semantic tokens: `primary`=`bg-accent-blue … text-white`; `secondary`=`bg-surface-elevated … text-content-primary border-border-strong`; `glass`=`apple-button text-content-primary`; `subtle`=`bg-white/[0.04] … text-content-secondary`; `ghost`=`hover:bg-white/[0.06] text-content-secondary`. On a white theme `subtle`/`ghost` (`bg-white/[0.04]`) and `secondary` (`text-content-primary`=#f5f5f7 on `surface-elevated`) collapse to invisible.
- **Input.tsx**: `bg-surface-primary/80`, `text-content-primary`, `placeholder:text-content-muted`, `border-border-glass`. Dark‑token based.
- **Modal.tsx**: backdrop `bg-black/80`; surface `apple-glass-elevated` (white #FFFFFF) + title `text-content-primary` (#f5f5f7) → **white‑on‑white**. Body text `text-content-secondary`. Footer divider `border-border-subtle`.
- **GlassPanel.tsx**: `subtle`=`bg-surface-primary/70`; `card`=`apple-glass-card` (white); `elevated`=`apple-glass-elevated` (white); `interactive`=`apple-glass-card … hover:border-white/[0.18]`. Content relies on caller using `text-content-*` (near‑white) → contrast problem on the white surfaces.
- **MediaCard.tsx**: artwork frame `bg-surface-primary border-border-glass`; hover overlay `from-black/85 … text-white`, badges `bg-black/60 text-white`, play button `bg-white text-surface-background`. The hover overlay (black gradient + white text) is correct for media; the `bg-white/[..]`‑free chrome below uses dark tokens.
- **Skeleton.tsx**: shimmer (check internal; uses `animate-pulse`‑style). `EmptyState`, `Badge`, `Tabs`, `Tooltip`, `Drawer`, `Dropdown`, `IconButton`, `NavigationItem`, `SearchBar`, `SectionHeader`, `Avatar`, `AvatarGroup`, `Toast` round out the set.

### 7.2 `src/components/navigation/`
`AppShell.tsx`, `AppHeader.tsx`, `DesktopSidebar.tsx`, `MobileNavigation.tsx` (see §5.2).

### 7.3 `src/components/entertainment/`
`MediaCard.tsx`, `MediaHero.tsx`, `MediaRow.tsx`, `GenreChips.tsx`, `SearchBar.tsx`, `SkeletonCard.tsx`, `TMDBAttribution.tsx`, `WatchlistButton.tsx`, `index.ts` (barrel). `MediaHero`/`MediaCard` use `bg-black/60` rating badges with `text-white` (correct over images). `MediaRow` scroll buttons use `opacity-0 group-hover/row:opacity-100`.

### 7.4 `src/components/music/`
`AddTrackModal.tsx`, `CollaboratorList.tsx`, `PlaylistCard.tsx`, `PlaylistHeader.tsx`, `PlaylistShareModal.tsx`, `PlaylistTrackRow.tsx`. Heavy `text-white` + `bg-white/[..]` (dark‑theme translucent) usage; remove‑button uses `opacity-0 group-hover:opacity-100`.

### 7.5 `src/components/library/`
`LibraryButton.tsx` (5 `text-white`).

### 7.6 Other
- `src/components/navbar.tsx` (legacy nav, §5.1).
- `src/components/providers.tsx` (QueryClient + Toast only).
- Hooks: `src/hooks/useLibrary.ts`, `useWatchlist.ts`.
- Lib/API: `src/lib/api.ts`, `authApi.ts`, `entertainmentApi.ts`, `libraryApi.ts`, `musicApi.ts`, `socialApi.ts`, `utils.ts` (`cn` helper, presumably).
- Store: `src/store/authStore.ts` (Zustand).
- Types: `src/types/auth.ts`, `entertainment.ts`, `music.ts`, `social.ts`.

---

## 8. Contrast / visibility problems

Patterns were searched **only** within the `white-ui-redesign/frontend/src` tree (other worktrees excluded). Per‑file counts:

### 8.1 `text-white` — 390 matches across 44 files
Hard‑coded white text, correct only on dark surfaces. Top offenders:

| File | Count |
|---|---|
| `app/friends/page.tsx` | 81 |
| `app/settings/account/page.tsx` | 30 |
| `app/profile/page.tsx` | 30 |
| `components/navbar.tsx` | 25 |
| `app/library/page.tsx` | 22 |
| `app/library/collections/page.tsx` | 22 |
| `app/complete-profile/page.tsx` | 21 |
| `app/library/music/page.tsx` | 18 |
| `app/library/favorites/page.tsx` | 10 |
| `app/library/movies/page.tsx` | 10 |
| `app/library/shows/page.tsx` | 9 |
| `app/playlists/page.tsx` | 9 |
| `app/playlists/create/page.tsx` | 8 |
| `components/music/PlaylistTrackRow.tsx` | 7 |
| `components/music/AddTrackModal.tsx` | 6 |
| `app/verify-email/page.tsx` | 6 |
| `components/music/CollaboratorList.tsx` | 6 |
| `components/library/LibraryButton.tsx` | 5 |
| `components/music/PlaylistHeader.tsx` | 5 |
| `app/playlists/discover/page.tsx` | 5 |
| `app/page.tsx` (home) | 5 |

Remaining (≤4 each): `components/ui/MediaCard.tsx` (4), `components/entertainment/MediaHero.tsx` (4), `components/music/PlaylistCard.tsx` (4), `app/reset-password/page.tsx` (3), `app/register/page.tsx` (3), `components/navigation/DesktopSidebar.tsx` (3), `components/ui/NavigationItem.tsx` (3), `components/navigation/MobileNavigation.tsx` (3), `components/ui/Button.tsx` (2), `components/music/PlaylistShareModal.tsx` (2), `app/login/page.tsx` (2), `app/forgot-password/page.tsx` (2), `app/search/SearchContent.tsx` (2), `components/ui/Tabs.tsx` (2), `components/entertainment/MediaCard.tsx` (2), `components/entertainment/GenreChips.tsx` (2), and singletons: `app/layout.tsx` (1 — `selection:text-white`), `components/ui/IconButton.tsx` (1), `app/email-verification-success/page.tsx` (1), `components/navigation/AppHeader.tsx` (1), `app/music/search/page.tsx` (1), `components/ui/Avatar.tsx` (1), `app/music/genres/page.tsx` (1). **Total 390.**

### 8.2 `bg-white/[…]` translucent dark‑theme surfaces — 182 matches across 41 files
These translucent‑white surfaces (`bg-white/[0.04]`, `bg-white/[0.08]`, etc.) are designed to sit on a dark background. On a white theme they render as **invisible** (white on white) and their `border-white/[0.08]` borders vanish. Top: `app/friends/page.tsx` (46), `app/settings/account/page.tsx` (10), `components/navbar.tsx` (10), `components/navigation/MobileNavigation.tsx` (9), `app/library/collections/page.tsx` (8), `app/library/music/page.tsx` (8), `app/library/page.tsx` (8), `app/library/shows/page.tsx` (6), `app/library/movies/page.tsx` (6), `app/library/favorites/page.tsx` (5), `components/library/LibraryButton.tsx` (5), `app/profile/page.tsx` (5), `app/complete-profile/page.tsx` (5), `components/navigation/AppHeader.tsx` (4), `components/music/AddTrackModal.tsx` (4), `components/music/CollaboratorList.tsx` (4), `components/navigation/DesktopSidebar.tsx` (3), `components/ui/Tabs.tsx` (3), plus 24 more files (2–1 each). **Total 182.**

### 8.3 `bg-black` / hardcoded dark backgrounds — 10 matches across 8 files
- `components/ui/Modal.tsx:64` — backdrop `bg-black/80` (intentional overlay).
- `components/ui/Drawer.tsx:59` — backdrop `bg-black/80` (intentional overlay).
- `components/ui/MediaCard.tsx:106` (+1) — hover overlay gradient `from-black/85`; watchlist button `bg-black/60`.
- `components/entertainment/MediaHero.tsx:63` — rating badge `bg-black/60`.
- `components/entertainment/MediaCard.tsx:87` — rating badge `bg-black/70`.
- `app/friends/page.tsx` (2) — `bg-black` usages.
- `app/library/collections/page.tsx` (1), `app/search/SearchContent.tsx` (1).
The modal/drawer backdrops and image overlays are legitimately dark; the `friends`/`library`/`search` uses should be reviewed.

### 8.4 Hardcoded `bg-[#08080a]` (near‑black) page surfaces — 5 matches, 4 files
- `app/layout.tsx:17` — root body `bg-[#08080a]`.
- `app/complete-profile/page.tsx:138` — full‑screen loading state `bg-[#08080a] text-white`.
- `app/profile/page.tsx` — loading state `bg-[#08080a] text-white`.
- `app/settings/account/page.tsx:124` — loading state `bg-[#08080a] text-white`.
These dark loaders flash black against an intended‑white UI.

### 8.5 `bg-[#121217]` dark `<option>` boxes — 6 matches, all `app/settings/account/page.tsx`
Lines 197–199 and 214–216: every `<option>` in two `<select>` privacy dropdowns carries `className="bg-[#121217]"` (dark). The option list renders dark boxes regardless of theme.

### 8.6 `opacity-0` (hover‑reveal) — 7 matches, 5 files
- `components/ui/MediaCard.tsx` (2), `components/entertainment/MediaRow.tsx` (2), `app/library/collections/page.tsx` (1), `components/music/PlaylistTrackRow.tsx` (1), `components/entertainment/MediaCard.tsx` (1). All are `opacity-0 group-hover:opacity-100` (reveal on hover) — behavior‑correct, but the revealed controls often use `text-white`/`bg-black` (see 8.1/8.3).

### 8.7 `text-transparent` (gradient‑clip headings) — 2 matches, 2 files
- `app/friends/page.tsx:603` — `<h1 … bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent>`.
- `app/page.tsx` (home) — a gradient‑clip title. These rely on a dark background to show a white gradient. On a white background the heading becomes **invisible**.

### 8.8 `dark:` variants / `var(--foreground)` / `var(--background)`
- `dark:(bg|text|border)`: **0 matches.** No `dark:` utilities exist; the `<html className="dark">` and Tailwind dark mode are entirely unused.
- `var(--foreground)` / `var(--background)` in component code: **0 matches.** The white CSS variables in `globals.css` are not consumed by any component; only `globals.css` itself referenced them historically (now replaced by hard‑coded `#1D1D1F`/`#FFFFFF` in the `body` rule).

### 8.9 The structural invisible‑text defects (highest severity)
1. **Auth pages + legacy Navbar** (`login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `email-verification-success`, `invitations/[token]`): page body is `bg-white`; `Navbar` (`components/navbar.tsx`) header is `apple-glass` (≈white) with brand/links `text-white` and dropdowns `apple-glass-card` (white) + `text-white`. **Entire navbar is white‑on‑white → invisible.**
2. **`Modal.tsx`** surface `apple-glass-elevated` (#FFFFFF) + title `text-content-primary` (#f5f5f7) → invisible modal headings wherever the modal renders opaque.
3. **`GlassPanel.tsx`** `card`/`elevated`/`interactive` surfaces are `apple-glass-card`/`apple-glass-elevated` (white); callers fill them with `text-content-primary` (#f5f5f7) content.
4. **`AppHeader.tsx`** notification dropdown: `apple-glass-elevated` (white) + `text-content-primary` (#f5f5f7) headings → low/zero contrast.
5. **`DesktopSidebar.tsx` / `MobileNavigation.tsx`** unauthenticated "Experience MovieFlow" cards: `apple-glass-card` (white) + `text-content-primary` (#f5f5f7) → invisible on white.
6. **`Button` `secondary`/`subtle`/`ghost`** variants: `text-content-primary`/#f5f5f7 on `bg-surface-elevated`/`bg-white/[0.04]` → collapse on white.

---

## 9. Gap to a white UI (summary for the redesign)

- **Token layer mismatch:** Tailwind semantic tokens are dark‑valued and not linked to the white CSS variables. A white redesign must either (a) re‑point `tailwind.config.ts` semantic tokens to light values / the CSS variables, or (b) replace semantic token usage with the `apple-glass*` + `--*` variable approach already present in `globals.css`. The LifeFlow reference (`.task/lifeflow-design-system.md`) uses the CSS‑variable approach under Tailwind v4.
- **No theme switching infra:** no `next-themes`/`ThemeProvider`/`data-theme`. If the redesign keeps a single light theme only, this is fine; if dark mode must remain, this infra must be added.
- **Inert `dark` class:** `layout.tsx` `<html className="dark">` and `bg-[#08080a]` body must be changed (remove `dark`, set white body) — otherwise every page stays dark.
- **Pervasive dark‑theme utilities to replace:** ~390 `text-white` and ~182 `bg-white/[…]` (translucent dark‑surface) usages across 40+ files, concentrated in `friends`, `settings/account`, `profile`, `navbar`, `library/*`, `complete-profile`, `playlists/*`, and the `music/*` components.
- **Hard‑coded dark surfaces:** `bg-[#08080a]` loaders (3 pages) and `bg-[#121217]` `<option>` boxes (`settings/account`) must be re‑themed.
- **Gradient‑clip titles** (`friends:603`, home) using white gradients become invisible on white.
- **Shared primitives** (`Button`, `Modal`, `GlassPanel`, `Input`, `MediaCard`) are token‑driven (dark); they will render wrong until the token layer is fixed or their classes are swapped to light equivalents.
- **Navigation consolidation:** two nav systems coexist (`navbar.tsx` legacy vs `navigation/AppShell`). Auth pages use the legacy `Navbar`; app pages use `AppShell`. The redesign should pick one.
- **Dangling nav links** (`/watch-together`, `/listen-together`, `/watchlist`) 404 in this worktree.

### Verification commands (from `…\white-ui-redesign\frontend`)
- Build: `npm run build`
- Lint: `npm run lint`
- Dev: `npm run dev` (port 3000)
- (No frontend unit tests exist.)

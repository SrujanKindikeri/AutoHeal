# LifeFlow — Design System Reference (Exact Values)

Source project: `c:\Users\kindi\OneDrive\Documents\LifeFlow-Main`
All values below are copied verbatim from the LifeFlow codebase. Nothing is invented or paraphrased.

---

## 0. Build & Config

**Framework:** Next.js 16.3.4 + React 19.2.8, App Router.
**Styling:** Tailwind CSS **v4** — CSS-based configuration, **no `tailwind.config.*` JS file**. PostCSS plugin only.

`postcss.config.mjs`:
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

`app/globals.css` head (the entire Tailwind config lives here):
```css
@import "tailwindcss";

/* Teach Tailwind v4 to recognise [data-theme="dark"] as the "dark" variant.
   Tailwind classes like dark:bg-white/[0.06] are emitted as
   [data-theme="dark"] .dark\:… selectors and respond to the LifeFlow theme
   attribute rather than the OS media query. */
@variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

There is **no JS Tailwind theme object** — all colors, spacing, radii, shadows, fonts are CSS custom properties consumed via inline `style={{ ... }}` and via the custom utility classes defined in `globals.css`. Tailwind utility classes are used for layout/flex/spacing/typography-scale; brand colors come from CSS variables, not Tailwind's color palette.

**Animation lib:** `framer-motion ^13.2.0`. **Icons:** `lucide-react ^1.42.0`.

---

## 1. Typography

**Font stack** (`globals.css` `html, body` rule, verbatim):
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
             'Helvetica Neue', 'Segoe UI', system-ui, sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: 'cv11', 'ss01';
```
No web-font `@import` / `next/font` call — the app uses the native system font stack only (Apple SF Pro on Apple devices, Segoe UI on Windows).

**Type-rendering helpers** (`globals.css`):
```css
.tabular-nums { font-variant-numeric: tabular-nums; }
```

**Responsive type helpers:**
```css
.text-responsive-xl { font-size: clamp(1.25rem, 3.5vw, 1.875rem); line-height: 1.25; font-weight: 700; }
.text-responsive-lg { font-size: clamp(1rem, 2.5vw, 1.375rem);   line-height: 1.3; font-weight: 600; }
```

**Practical type scale / weights / line-heights** observed in components (Tailwind classes + inline values):
- Page/section titles: `text-[22px] font-bold tracking-tight`, `text-[20px] font-bold tracking-tight`, `text-[15px] font-semibold`, `text-[13px]`
- Body: `text-sm` (14px), `text-[13px]`; labels: `text-xs font-semibold uppercase tracking-wide` (12px)
- Nav item labels: `text-[13px] font-medium`; bottom-nav labels: `text-[10px] font-semibold leading-none`
- Sidebar group labels: `text-[10px] font-bold uppercase tracking-[0.12em]`
- Hints/footnotes: `text-[12px]`, `text-[11px]`
- Weights used: `font-bold` (700), `font-semibold` (600), `font-medium` (500).
- `tracking-tight` for headings; `tracking-wide` / `tracking-[0.12em]` / `tracking-wider` for uppercase labels.
- Title in AppHeader uses `clamp(13px, 3.8vw, 15px)`.

**Gradient text** (both classes identical, verbatim):
```css
.text-gradient, .gradient-text {
  background: linear-gradient(135deg, #2563EB 0%, #3B82F6 50%, #1D4ED8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 2. `:root` Light Theme — All CSS Custom Properties (verbatim)

```css
:root {
  /* Backgrounds (light) */
  --bg-base:              #F4F5FA;
  --bg-secondary:         #ECEEF6;
  --bg-tertiary:          #E3E5EF;

  /* Glass Level 1 — Subtle */
  --glass-subtle-bg:         rgba(255, 255, 255, 0.52);
  --glass-subtle-border:     rgba(0, 0, 0, 0.06);
  --glass-subtle-blur:       12px;
  --glass-subtle-saturate:   1.55;
  --glass-subtle-shadow:     0 1px 4px rgba(0,0,0,0.04);

  /* Glass Level 2 — Regular */
  --glass-regular-bg:        rgba(255, 255, 255, 0.68);
  --glass-regular-border:    rgba(0, 0, 0, 0.075);
  --glass-regular-blur:      18px;
  --glass-regular-saturate:  1.65;
  --glass-regular-shadow:    0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);

  /* Glass Level 3 — Elevated */
  --glass-elevated-bg:       rgba(255, 255, 255, 0.80);
  --glass-elevated-border:   rgba(0, 0, 0, 0.085);
  --glass-elevated-blur:     26px;
  --glass-elevated-saturate: 1.75;
  --glass-elevated-shadow:   0 4px 20px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05);

  /* Glass Level 4 — Floating */
  --glass-floating-bg:       rgba(255, 255, 255, 0.90);
  --glass-floating-border:   rgba(0, 0, 0, 0.09);
  --glass-floating-blur:     34px;
  --glass-floating-saturate: 1.85;
  --glass-floating-shadow:   0 8px 40px rgba(0,0,0,0.10), 0 3px 10px rgba(0,0,0,0.06);

  /* Inner catch-light (top-edge specular highlight) */
  --glass-catchlight:        rgba(255, 255, 255, 0.90);
  --glass-catchlight-stop:   rgba(255, 255, 255, 0.25);

  /* Tint overlay */
  --glass-tint:              rgba(240, 245, 255, 0.18);
  --glass-tint-strong:       rgba(235, 242, 255, 0.28);

  /* Shadows — soft, light-mode appropriate */
  --glass-shadow:            0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  --glass-shadow-md:         0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.05);
  --glass-shadow-lg:         0 8px 40px rgba(0, 0, 0, 0.10), 0 3px 10px rgba(0, 0, 0, 0.06);
  --glass-shadow-xl:         0 16px 60px rgba(0, 0, 0, 0.13), 0 6px 20px rgba(0, 0, 0, 0.07);

  /* Navigation panel surfaces */
  --glass-panel-bg:          rgba(252, 252, 255, 0.88);
  --glass-panel-border:      rgba(0, 0, 0, 0.07);
  --glass-panel-shadow:      0 4px 24px rgba(0, 0, 0, 0.07), 0 1px 4px rgba(0, 0, 0, 0.04);
  --glass-panel-blur:        32px;
  --glass-panel-saturate:    1.80;

  /* Hover lift effect */
  --glass-hover-shadow:      0 8px 32px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06);

  /* Typography */
  --text-primary:            #111318;
  --text-secondary:          #4A4E5A;
  --text-muted:              #8A8E9A;
  --text-faint:              #B8BBC6;

  /* Accent — Apple-like blue */
  --accent:                  #2563EB;
  --accent-hover:            #1D4ED8;
  --accent-light:            #3B82F6;
  --accent-dim:              rgba(37, 99, 235, 0.10);
  --accent-dim-hover:        rgba(37, 99, 235, 0.16);
  --accent-glow:             rgba(37, 99, 235, 0.18);
  --accent-text:             #1E40AF;

  /* Semantic colors */
  --success:                 #16A34A;
  --success-dim:             rgba(22, 163, 74, 0.10);
  --success-text:            #15803D;
  --warning:                 #D97706;
  --warning-dim:             rgba(217, 119, 6, 0.10);
  --warning-text:            #B45309;
  --danger:                  #DC2626;
  --danger-dim:              rgba(220, 38, 38, 0.10);
  --danger-text:             #B91C1C;
  --info:                    #0284C7;
  --info-dim:                rgba(2, 132, 199, 0.10);

  /* Border tokens */
  --border:                  rgba(0, 0, 0, 0.07);
  --border-subtle:           rgba(0, 0, 0, 0.05);
  --border-strong:           rgba(0, 0, 0, 0.12);
  --border-focus:            rgba(37, 99, 235, 0.50);

  /* Radii */
  --radius-sm:               10px;
  --radius-md:               14px;
  --radius-lg:               20px;
  --radius-xl:               24px;
  --radius-2xl:              32px;

  /* Spacing rhythm */
  --space-section:           24px;
  --space-card:              20px;
  --space-inner:             14px;

  /* Transitions */
  --transition-fast:         150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base:         220ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow:         350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-spring:       400ms cubic-bezier(0.34, 1.56, 0.64, 1);
  --transition-glass:        200ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Layout */
  --sidebar-width:           252px;
  --topbar-height:           56px;
  --bottomnav-height:        56px;

  /* Nav item hover background */
  --nav-hover-bg:            rgba(0, 0, 0, 0.04);

  /* Button surfaces */
  --btn-secondary-bg:        rgba(255, 255, 255, 0.70);
  --btn-secondary-border:    rgba(0, 0, 0, 0.09);
  --btn-secondary-hover-bg:  rgba(255, 255, 255, 0.88);
  --btn-ghost-hover-bg:      rgba(0, 0, 0, 0.05);

  /* Money/Finance accent colors */
  --money-collect-bg:        rgba(99, 102, 241, 0.08);
  --money-collect-border:    rgba(99, 102, 241, 0.18);
  --money-pay-bg:            rgba(249, 115, 22, 0.08);
  --money-pay-border:        rgba(249, 115, 22, 0.18);
}
```

Extra `:root` computed layout tokens (verbatim):
```css
:root {
  --mobile-nav-pad: calc(var(--bottomnav-height, 56px) + env(safe-area-inset-bottom, 0px) + 16px);
  --bottomnav-total-height: calc(var(--bottomnav-height, 56px) + env(safe-area-inset-bottom, 0px));
}
```

---

## 3. `[data-theme="dark"]` Dark Theme — All CSS Custom Properties (verbatim)

```css
[data-theme="dark"] {
  /* Backgrounds */
  --bg-base:                 #0D0E13;
  --bg-secondary:            #121319;
  --bg-tertiary:             #191A22;

  --glass-subtle-bg:         rgba(255, 255, 255, 0.035);
  --glass-subtle-border:     rgba(255, 255, 255, 0.07);
  --glass-subtle-blur:       12px;
  --glass-subtle-saturate:   1.40;
  --glass-subtle-shadow:     0 1px 3px rgba(0,0,0,0.30);

  --glass-regular-bg:        rgba(255, 255, 255, 0.055);
  --glass-regular-border:    rgba(255, 255, 255, 0.095);
  --glass-regular-blur:      18px;
  --glass-regular-saturate:  1.50;
  --glass-regular-shadow:    0 2px 12px rgba(0,0,0,0.40), 0 1px 3px rgba(0,0,0,0.28);

  --glass-elevated-bg:       rgba(255, 255, 255, 0.075);
  --glass-elevated-border:   rgba(255, 255, 255, 0.115);
  --glass-elevated-blur:     26px;
  --glass-elevated-saturate: 1.60;
  --glass-elevated-shadow:   0 4px 20px rgba(0,0,0,0.50), 0 2px 6px rgba(0,0,0,0.32);

  --glass-floating-bg:       rgba(255, 255, 255, 0.095);
  --glass-floating-border:   rgba(255, 255, 255, 0.135);
  --glass-floating-blur:     34px;
  --glass-floating-saturate: 1.70;
  --glass-floating-shadow:   0 8px 40px rgba(0,0,0,0.60), 0 3px 10px rgba(0,0,0,0.38);

  --glass-catchlight:        rgba(255, 255, 255, 0.10);
  --glass-catchlight-stop:   rgba(255, 255, 255, 0.04);

  --glass-tint:              rgba(59, 80, 130, 0.10);
  --glass-tint-strong:       rgba(59, 80, 130, 0.16);

  --glass-shadow:            0 2px 12px rgba(0,0,0,0.42), 0 1px 3px rgba(0,0,0,0.28);
  --glass-shadow-md:         0 4px 20px rgba(0,0,0,0.50), 0 2px 6px rgba(0,0,0,0.32);
  --glass-shadow-lg:         0 8px 40px rgba(0,0,0,0.58), 0 3px 10px rgba(0,0,0,0.38);
  --glass-shadow-xl:         0 16px 60px rgba(0,0,0,0.68), 0 6px 20px rgba(0,0,0,0.44);
  --glass-hover-shadow:      0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35);

  --text-primary:            #E8EAF0;
  --text-secondary:          #A8ABBE;
  --text-muted:              #6B6F82;
  --text-faint:              #4A4D60;

  --accent:                  #3B82F6;
  --accent-hover:            #60A5FA;
  --accent-light:            #93C5FD;
  --accent-dim:              rgba(59, 130, 246, 0.15);
  --accent-dim-hover:        rgba(59, 130, 246, 0.22);
  --accent-glow:             rgba(59, 130, 246, 0.25);
  --accent-text:             #93C5FD;

  --success:                 #22C55E;
  --success-dim:             rgba(34, 197, 94, 0.15);
  --success-text:            #4ADE80;
  --warning:                 #F59E0B;
  --warning-dim:             rgba(245, 158, 11, 0.15);
  --warning-text:            #FCD34D;
  --danger:                  #EF4444;
  --danger-dim:              rgba(239, 68, 68, 0.15);
  --danger-text:             #FCA5A5;
  --info:                    #38BDF8;
  --info-dim:                rgba(56, 189, 248, 0.15);

  --border:                  rgba(255, 255, 255, 0.08);
  --border-subtle:           rgba(255, 255, 255, 0.05);
  --border-strong:           rgba(255, 255, 255, 0.14);
  --border-focus:            rgba(59, 130, 246, 0.60);

  --glass-panel-bg:          rgba(18, 19, 28, 0.94);
  --glass-panel-border:      rgba(255, 255, 255, 0.08);
  --glass-panel-shadow:      0 4px 24px rgba(0,0,0,0.45), 0 1px 4px rgba(0,0,0,0.32);
  --glass-panel-blur:        32px;
  --glass-panel-saturate:    1.65;

  --nav-hover-bg:            rgba(255, 255, 255, 0.05);

  --btn-secondary-bg:        rgba(255, 255, 255, 0.07);
  --btn-secondary-border:    rgba(255, 255, 255, 0.11);
  --btn-secondary-hover-bg:  rgba(255, 255, 255, 0.11);
  --btn-ghost-hover-bg:      rgba(255, 255, 255, 0.06);

  --money-collect-bg:        rgba(99, 102, 241, 0.12);
  --money-collect-border:    rgba(99, 102, 241, 0.22);
  --money-pay-bg:            rgba(249, 115, 22, 0.12);
  --money-pay-border:        rgba(249, 115, 22, 0.22);
}
```

Dark-mode component overrides applied to the same `.glass-*` classes (verbatim):
```css
[data-theme="dark"] .glass-input      { background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.10); color: var(--text-primary); }
[data-theme="dark"] .glass-input:hover { border-color: rgba(255, 255, 255, 0.16); background: rgba(255, 255, 255, 0.09); }
[data-theme="dark"] .glass-input:focus { border-color: var(--border-focus); background: rgba(255, 255, 255, 0.08); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.45); }
[data-theme="dark"] .glass-input option { background: #191A22; color: var(--text-primary); }

[data-theme="dark"] .btn-glass-secondary        { box-shadow: 0 1px 4px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.07); }
[data-theme="dark"] .btn-glass-secondary:hover   { box-shadow: 0 2px 8px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.10); }
[data-theme="dark"] .btn-glass-secondary:active  { background: rgba(255,255,255,0.05); }

[data-theme="dark"] .glass-segment-active { background: rgba(255, 255, 255, 0.10); border: 1px solid rgba(255, 255, 255, 0.13); box-shadow: 0 1px 4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08); }
[data-theme="dark"] .nav-active-pill { background: var(--accent-dim); border: 1px solid rgba(59, 130, 246, 0.22); box-shadow: inset 0 1px 0 rgba(255,255,255,0.06); }
[data-theme="dark"] .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; }
[data-theme="dark"] ::-webkit-scrollbar-thumb       { background: rgba(255,255,255,0.12); }
[data-theme="dark"] ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
[data-theme="dark"] .progress-ring-track { stroke: rgba(255, 255, 255, 0.08); }

/* Dark category colors */
[data-theme="dark"] .cat-food          { color: #FB923C; }
[data-theme="dark"] .cat-transport     { color: #60A5FA; }
[data-theme="dark"] .cat-shopping      { color: #F472B6; }
[data-theme="dark"] .cat-bills         { color: #F87171; }
[data-theme="dark"] .cat-entertainment { color: #A78BFA; }
[data-theme="dark"] .cat-education     { color: #38BDF8; }
[data-theme="dark"] .cat-health        { color: #4ADE80; }
[data-theme="dark"] .cat-other         { color: #9CA3AF; }
```

---

## 4. Night Shift Overlay (`[data-night-shift="true"]`)

```css
[data-night-shift="true"] {
  --glass-subtle-bg:    rgba(255, 248, 238, 0.50);
  --glass-regular-bg:   rgba(255, 248, 238, 0.62);
  --glass-elevated-bg:  rgba(255, 248, 238, 0.76);
  --glass-floating-bg:  rgba(255, 248, 238, 0.87);
  --glass-panel-bg:     rgba(255, 250, 242, 0.90);
  --glass-catchlight:   rgba(255, 252, 240, 0.88);
  --glass-tint:         rgba(255, 220, 160, 0.08);
  --accent-glow:        rgba(37, 99, 235, 0.10);
}
[data-theme="dark"][data-night-shift="true"] {
  --glass-subtle-bg:    rgba(55, 38, 18, 0.22);
  --glass-regular-bg:   rgba(55, 38, 18, 0.30);
  --glass-elevated-bg:  rgba(55, 38, 18, 0.38);
  --glass-floating-bg:  rgba(55, 38, 18, 0.46);
  --glass-panel-bg:     rgba(30, 22, 12, 0.95);
  --glass-catchlight:   rgba(255, 220, 140, 0.07);
  --glass-tint:         rgba(80, 50, 20, 0.12);
  --accent-glow:        rgba(59, 130, 246, 0.12);
}
```

Theme is driven by two attributes on `<html>`: `data-theme="light"|"dark"` and `data-night-shift="true"|"false"`. `ThemeProvider` reads `lf_appearance` from localStorage; an inline `beforeInteractive` script in `app/layout.tsx` sets the attributes pre-paint to avoid FOUC. `AppTheme = 'light' | 'dark' | 'system'`; `'system'` resolves via `matchMedia('(prefers-color-scheme: dark)')`. `DEFAULT_APPEARANCE` = `{ theme: 'light', nightShiftEnabled: false, nightShiftStart: '22:00', nightShiftEnd: '07:00', turnToneEnabled: true, turnToneVolume: 0.5 }`. Night Shift is re-evaluated every 60s via `setInterval` and handles cross-midnight windows (e.g. 22:00→07:00).

---

## 5. Liquid Glass Implementation — Exact CSS & Which Components Use It

### 5.1 The five glass material classes (verbatim, with fallbacks)

```css
/* Level 1: Subtle */
.glass-subtle {
  position: relative;
  background: var(--glass-subtle-bg);
  border: 1px solid var(--glass-subtle-border);
}
@supports (backdrop-filter: blur(1px)) {
  .glass-subtle { backdrop-filter: blur(var(--glass-subtle-blur)) saturate(var(--glass-subtle-saturate)); -webkit-backdrop-filter: blur(var(--glass-subtle-blur)) saturate(var(--glass-subtle-saturate)); }
}
@supports not (backdrop-filter: blur(1px)) { .glass-subtle { background: rgba(248, 249, 255, 0.88); } }

/* Level 2: Regular */
.glass {
  position: relative;
  background: var(--glass-regular-bg);
  border: 1px solid var(--glass-regular-border);
  box-shadow: var(--glass-regular-shadow);
  transition: box-shadow var(--transition-glass);
}
@supports (backdrop-filter: blur(1px)) { .glass { backdrop-filter: blur(var(--glass-regular-blur)) saturate(var(--glass-regular-saturate)); -webkit-backdrop-filter: blur(var(--glass-regular-blur)) saturate(var(--glass-regular-saturate)); } }
@supports not (backdrop-filter: blur(1px)) { .glass { background: rgba(245, 247, 253, 0.94); } }

/* Level 3: Elevated */
.glass-elevated {
  position: relative;
  background: var(--glass-elevated-bg);
  border: 1px solid var(--glass-elevated-border);
  box-shadow: var(--glass-elevated-shadow);
  transition: box-shadow var(--transition-glass);
}
@supports (backdrop-filter: blur(1px)) { .glass-elevated { backdrop-filter: blur(var(--glass-elevated-blur)) saturate(var(--glass-elevated-saturate)); -webkit-backdrop-filter: blur(var(--glass-elevated-blur)) saturate(var(--glass-elevated-saturate)); } }
@supports not (backdrop-filter: blur(1px)) { .glass-elevated { background: rgba(240, 243, 252, 0.96); } }

/* Level 4: Floating */
.glass-floating {
  position: relative;
  background: var(--glass-floating-bg);
  border: 1px solid var(--glass-floating-border);
  box-shadow: var(--glass-floating-shadow);
  transition: box-shadow var(--transition-glass);
}
@supports (backdrop-filter: blur(1px)) { .glass-floating { backdrop-filter: blur(var(--glass-floating-blur)) saturate(var(--glass-floating-saturate)); -webkit-backdrop-filter: blur(var(--glass-floating-blur)) saturate(var(--glass-floating-saturate)); } }
@supports not (backdrop-filter: blur(1px)) { .glass-floating { background: rgba(250, 251, 255, 0.98); } }

/* Navigation panel (sidebar, topbar, bottomnav) */
.glass-panel {
  position: relative;
  background:    var(--glass-panel-bg);
  border-color:  var(--glass-panel-border);
  box-shadow:    var(--glass-panel-shadow);
  transition: box-shadow var(--transition-glass);
}
@supports (backdrop-filter: blur(1px)) { .glass-panel { backdrop-filter: blur(var(--glass-panel-blur)) saturate(var(--glass-panel-saturate)); -webkit-backdrop-filter: blur(var(--glass-panel-blur)) saturate(var(--glass-panel-saturate)); } }
@supports not (backdrop-filter: blur(1px)) { .glass-panel { background: rgba(252, 252, 255, 0.98); } }
```

Backward-compat aliases that reuse elevated/floating tokens:
```css
.glass-strong { background: var(--glass-elevated-bg); border: 1px solid var(--glass-elevated-border); box-shadow: var(--glass-elevated-shadow); /* + backdrop-filter blur(elevated) */ }
.glass-hero   { background: var(--glass-floating-bg); border: 1px solid var(--glass-floating-border); box-shadow: var(--glass-shadow-xl); /* + backdrop-filter blur(floating) */ }
```

### 5.2 Enhancement modifiers (verbatim)

```css
/* Catch-light — specular top-left highlight strip (::before) */
.glass-catchlight::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(148deg, var(--glass-catchlight) 0%, var(--glass-catchlight-stop) 22%, transparent 55%);
  pointer-events: none; z-index: 0;
}
.glass-catchlight > * { position: relative; z-index: 1; }

/* Backward-compat alias using ::after */
.glass-highlight::after { /* identical gradient, ::after */ }

/* Tint overlay */
.glass-tinted::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: var(--glass-tint); pointer-events: none; }

/* Depth border — inset shadow for recessed edge */
.glass-depth { box-shadow: var(--glass-shadow-md), inset 0 1px 0 var(--glass-catchlight), inset 0 -1px 0 rgba(0, 0, 0, 0.03); }

/* Inner ring — secondary inner border */
.glass-ring { box-shadow: var(--glass-shadow-lg), inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.90); }
```

### 5.3 Glass input (verbatim)

```css
.glass-input {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(0, 0, 0, 0.09);
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
}
@supports (backdrop-filter: blur(1px)) { .glass-input { backdrop-filter: blur(10px) saturate(1.4); -webkit-backdrop-filter: blur(10px) saturate(1.4); } }
.glass-input:hover { border-color: rgba(0, 0, 0, 0.14); background: rgba(255, 255, 255, 0.90); }
.glass-input:focus { border-color: var(--border-focus); background: rgba(255, 255, 255, 0.98); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10), 0 0 0 1px rgba(37, 99, 235, 0.35); }
.glass-input::placeholder { color: var(--text-faint); }
.glass-input:disabled { opacity: 0.45; cursor: not-allowed; }
.glass-input option { background: #ffffff; color: var(--text-primary); }
.glass-input { font-size: 16px; }                 /* prevent iOS zoom (<16px triggers it) */
@media (min-width: 768px) { .glass-input { font-size: 14px; } }   /* restore design intent on tablet+ */
```

### 5.4 Glass button surfaces (verbatim)

```css
.btn-glass-secondary {
  background: var(--btn-secondary-bg);
  border: 1px solid var(--btn-secondary-border);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.80);
  transition: background var(--transition-glass), box-shadow var(--transition-glass), border-color var(--transition-glass);
}
@supports (backdrop-filter: blur(1px)) { .btn-glass-secondary { backdrop-filter: blur(12px) saturate(1.5); -webkit-backdrop-filter: blur(12px) saturate(1.5); } }
.btn-glass-secondary:hover  { background: var(--btn-secondary-hover-bg); border-color: rgba(0,0,0,0.12); box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.90); }
.btn-glass-secondary:active { background: rgba(255,255,255,0.65); box-shadow: 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.60); }
.btn-glass-ghost:hover { background: var(--btn-ghost-hover-bg); }
```

### 5.5 Nav item + money surfaces (verbatim)

```css
.nav-hover:hover { background: var(--nav-hover-bg); }
.nav-hover-danger:hover { background: var(--danger-dim); }
.nav-active-pill { background: var(--accent-dim); border: 1px solid rgba(37, 99, 235, 0.16); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.60); }
.glass-segment-active { background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(0, 0, 0, 0.08); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95); }
.glass-money-collect { background: var(--money-collect-bg); border: 1px solid var(--money-collect-border); transition: background var(--transition-glass), border-color var(--transition-glass); }
.glass-money-pay     { background: var(--money-pay-bg);     border: 1px solid var(--money-pay-border);     transition: background var(--transition-glass), border-color var(--transition-glass); }
```

### 5.6 Which components use which glass level

| Glass level (CSS class) | Used by |
|---|---|
| `.glass-subtle` | `GlassSurface variant="subtle"` / `GlassInset`; decorative backgrounds, list rows, inner cells |
| `.glass` (regular) | `GlassCard level="regular"` / `GlassCardSurface`; standard content cards; Cancel buttons use `glass` |
| `.glass-elevated` (also alias `.glass-strong`) | `GlassCard level="elevated"` / `GlassSurface variant="strong"` / `GlassHero`; important/focused cards, section heroes; Recharts tooltips |
| `.glass-floating` (also alias `.glass-hero`) | `Modal` (`glass-floating glass-catchlight`); auth cards (`glass-floating glass-catchlight`); `Toast`; popovers, sheets |
| `.glass-panel` | `Sidebar` panel, `AppHeader` (mobile top bar), `BottomNav` (bottom bar), `GlassSurface variant="panel"` |

Primary/danger/success buttons use **solid accent colours**, not glass (see §7).

---

## 6. Animation / Transition Patterns

### 6.1 CSS transition tokens (verbatim, repeated for quick reference)
```css
--transition-fast:    150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base:    220ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow:     350ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-spring:  400ms cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot spring */
--transition-glass:   200ms cubic-bezier(0.4, 0, 0.2, 1);
```

### 6.2 CSS keyframes (verbatim)
```css
@keyframes fadeIn      { from { opacity: 0; transform: translateY(8px); }  to { opacity: 1; transform: translateY(0); } }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.96); }     to { opacity: 1; transform: scale(1); } }
@keyframes slideUp     { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInRight{ from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
@keyframes shimmer     { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse-soft  { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes spin        { to { transform: rotate(360deg); } }
@keyframes bounce-dot  { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
@keyframes glass-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.72; } }
```

### 6.3 Animation utility classes (verbatim)
```css
.animate-fade-in        { animation: fadeIn 0.35s ease forwards; }
.animate-fade-in-scale  { animation: fadeInScale 0.25s ease forwards; }
.animate-slide-up       { animation: slideUp 0.35s ease forwards; }
.animate-slide-in-right { animation: slideInRight 0.3s ease forwards; }
.animate-spin-slow      { animation: spin 1.2s linear infinite; }
.animate-glass-pulse    { animation: glass-pulse 2s ease-in-out infinite; }
.skeleton { animation: shimmer 1.6s ease-in-out infinite; border-radius: var(--radius-sm); }
```

### 6.4 Framer-motion spring configs actually used in components (verbatim)
- **Buttons / bottom-nav tap:** `transition={{ type: 'spring', stiffness: 500, damping: 30 }}`; `whileTap={ isDisabled ? undefined : { scale: 0.97 } }`; `whileHover={ isDisabled ? undefined : { scale: 1.01 } }`.
- **Bottom-nav active pill / sidebar active pill (layout animation):** `transition={{ type: 'spring', stiffness: 420, damping: 36 }}`; pill via `layoutId="bottom-nav-active-bg"` / `layoutId="sidebar-active-pill"`.
- **Sidebar nav item hover:** `whileHover={{ x: isActive ? 0 : 2 }}`, `whileTap={{ scale: 0.97 }}`, `transition={{ type: 'spring', stiffness: 420, damping: 30 }}`.
- **Bottom-nav item tap:** `whileTap={{ scale: 0.88 }}`, `transition={{ type: 'spring', stiffness: 500, damping: 30 }}`.
- **Modal open:** `initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}`.
- **Modal backdrop:** `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}`; backdrop `background: rgba(0,0,0,0.35); backdropFilter: blur(4px)`.
- **Toast:** `initial={{ opacity: 0, x: 40, scale: 0.92 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 40, scale: 0.92 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}`.
- **More panel (BottomNav):** `initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 10 }} transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}`.
- **AppHeader mount:** `initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}`.
- **Auth card (login):** outer `initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}`; step switches `initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}` (AnimatePresence `mode="wait"`); logo icon `initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 20 }}`.

Easing arrays used: `[0.25, 0.46, 0.45, 0.94]` (More panel), `[0.22, 1, 0.36, 1]` (auth card).

### 6.5 Reduced motion (verbatim)
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Card, Button & Form Control Components

### 7.1 `GlassCard` (`components/ui/GlassCard.tsx`)
A `motion.div`. Props: `level` (`subtle|regular|elevated|floating` → `glass-subtle|glass|glass-elevated|glass-floating`), `padding` (`none|xs|sm|md|lg` → `''|p-3|p-4|p-5|p-6`), `hover`, `glow`, `highlight`, `catchlight`. Base class: `relative rounded-2xl`.
- `hover` adds: `cursor-pointer transition-[box-shadow,transform] duration-200 hover:shadow-[var(--glass-hover-shadow)] hover:-translate-y-px active:translate-y-0`.
- `glow` adds: `shadow-[0_0_32px_rgba(37,99,235,0.10)]`.
- `highlight` → `glass-highlight`; `catchlight` → `glass-catchlight`.

### 7.2 `GlassSurface` (`components/ui/GlassSurface.tsx`) — non-motion, render-as-any-tag surface
Variants → class map:
```
subtle → glass-subtle, regular → glass, strong → glass-elevated,
modal  → glass-floating, control → glass-elevated, panel → glass-panel
```
Padding: `none|xs|sm|md|lg` → `''|p-3|p-4|p-5|p-6`. Radius: `none→rounded-none, sm→rounded-xl, md→rounded-2xl, lg→rounded-[20px], xl→rounded-[24px], 2xl→rounded-[32px], full→rounded-full`. Modifiers `catchlight|depth|ring|interactive` map to `glass-catchlight|glass-depth|glass-ring` + the same hover-lift set as GlassCard. Wrappers: `GlassCardSurface` (regular+md+md), `GlassHero` (strong+catchlight), `GlassModal` (modal+xl+depth), `GlassInset` (subtle+sm).

### 7.3 `GlassButton` (`components/ui/GlassButton.tsx`)
`motion.button`, `whileTap={{scale:0.97}} whileHover={{scale:1.01}} transition={{type:'spring', stiffness:500, damping:30}}`.
Variants (`primary|secondary|ghost|danger|success`) and sizes (`xs|sm|md|lg`):

| Variant | Class string | Inline style |
|---|---|---|
| primary | `text-white font-semibold border border-blue-500/20` | `background: var(--accent); boxShadow: 0 2px 12px rgba(37,99,235,0.22), inset 0 1px 0 rgba(255,255,255,0.15); color:#ffffff` |
| secondary | `btn-glass-secondary font-medium` | `color: var(--text-secondary)` |
| ghost | `btn-glass-ghost border border-transparent` | `color: var(--text-secondary)` |
| danger | `border` | `background: rgba(220,38,38,0.08); borderColor: rgba(220,38,38,0.18); color: var(--danger-text)` |
| success | `border` | `background: rgba(22,163,74,0.08); borderColor: rgba(22,163,74,0.18); color: var(--success-text)` |

Size classes (verbatim):
```
xs: 'px-2.5 py-1   text-xs  gap-1   rounded-lg'
sm: 'px-3   py-1.5 text-sm  gap-1.5 rounded-xl'
md: 'px-4   py-2   text-sm  gap-2   rounded-xl'
lg: 'px-5   py-2.5 text-[15px] gap-2 rounded-xl'
```
Common classes: `relative inline-flex items-center justify-center font-medium transition-colors duration-150 focus-ring select-none disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`. Loading state shows an inline SVG spinner + "Loading…". Note primary uses `border-blue-500/20` (a literal Tailwind blue class, the only place a Tailwind palette color appears in brand styling).

### 7.4 `GlassInput` / `GlassTextarea` / `GlassSelect` (`components/ui/GlassInput.tsx`)
All inputs use class `glass-input w-full rounded-xl text-sm px-3.5 py-2.5` (+ `leftIcon && 'pl-9'`, `+ rightIcon && 'pr-9'`; textarea adds `resize-none min-h-[96px]`; select adds `appearance-none cursor-pointer pr-9`). Error state: `!border-red-400 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(220,38,38,0.10)]`. Label: `text-xs font-semibold uppercase tracking-wide` with `color: var(--text-muted)`. Error text `color: var(--danger)`; hint text `color: var(--text-faint)`. `id` derived from label when not passed.

### 7.5 `Modal` / `ConfirmDialog` (`components/ui/Modal.tsx`)
Sizes → `max-w-xs|sm|md|lg|xl`(max-w-2xl). Container: `fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5`. Backdrop: `absolute inset-0`, `background: rgba(0,0,0,0.35)`, `backdropFilter: blur(4px)`. Dialog: `glass-floating glass-catchlight relative w-full max-h-[90dvh] overflow-y-auto rounded-t-[28px] sm:rounded-2xl` + `boxShadow: var(--glass-shadow-xl), inset 0 1px 0 var(--glass-catchlight)`. Drag handle (mobile, `sm:hidden`): `modal-drag-handle w-9 h-1 rounded-full`. Header title `text-[15px] font-semibold color: var(--text-primary)` with `borderBottom: 1px solid var(--border)`. Body `p-5`. `ConfirmDialog` confirm button uses solid `background: danger ? var(--danger) : var(--accent)` + `boxShadow: 0 2px 8px rgba(220,38,38,0.20)|rgba(37,99,235,0.20)`; Cancel uses `glass` class + `nav-hover`. Escape closes; body scroll locked while open.

### 7.6 `Toast` (`components/ui/Toast.tsx`)
Container `fixed right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-xs w-full`, bottom `calc(var(--bottomnav-height,56px) + env(safe-area-inset-bottom,0px) + 12px)`; on `min-width:640px` shifts to `bottom: 20px`. Toast: `pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl text-sm font-medium backdrop-blur-xl`, `background: var(--glass-floating-bg)`, `backdropFilter: blur(36px) saturate(1.8)`, `boxShadow: var(--glass-shadow-md)`. Borders per type: success `rgba(22,163,74,0.25)`, error `rgba(220,38,38,0.25)`, warning `rgba(217,119,6,0.25)`, info `rgba(37,99,235,0.25)`. Icon color: `var(--success|--danger|--warning|--accent)`. Auto-dismiss after 4200ms; max 4 toasts (`slice(-3)` keeps last 3 + new). `aria-live="polite"`.

---

## 8. Navigation / Sidebar / Header Components

### 8.1 `Sidebar` (`components/layout/Sidebar.tsx`) — desktop only (`hidden lg:flex`)
- Outer `<aside>`: `className="hidden lg:flex flex-col p-3"`, inline `position: fixed; top:0; left:0; bottom:0; width: var(--sidebar-width,252px); zIndex:20`, `aria-label="Main sidebar"`.
- Panel: `className="glass-panel glass-catchlight flex flex-col rounded-2xl py-4 overflow-hidden"`, inline `height:100%; minHeight:0; paddingLeft:10px; paddingRight:10px; border:1px solid var(--glass-panel-border); boxShadow: var(--glass-panel-shadow), inset 0 1px 0 var(--glass-catchlight)`.
- Logo block: `flex mb-5 flex-shrink-0 px-1`; Link `nav-hover flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl transition-colors group`. Logo box: `w-9 h-9 rounded-xl flex items-center justify-center text-[18px] flex-shrink-0`, inline `background: linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(59,130,246,0.08) 100%); border:1px solid rgba(37,99,235,0.16); boxShadow:0 2px 8px rgba(37,99,235,0.12)`. Wordmark: `text-[16px] font-bold text-gradient tracking-tight`.
- Nav scroll area: `flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto overflow-x-hidden sidebar-nav-scroll`, `aria-label="Main navigation"`.
- Group label: `text-[10px] font-bold uppercase tracking-[0.12em] px-3 mb-1`, `color: var(--text-faint)`.
- Item wrapper `flex flex-col gap-0.5`; active pill via `motion.div layoutId="sidebar-active-pill" className="absolute inset-0 nav-active-pill rounded-xl" transition={{type:'spring',stiffness:420,damping:36}}`.
- Item row: `motion.div whileHover={{x: isActive?0:2}} whileTap={{scale:0.97}} transition={{type:'spring',stiffness:420,damping:30}}` className `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors` (+ `nav-hover` when inactive), `color: isActive?var(--accent-text):var(--text-secondary)`.
- Icon `size={15}` `color: isActive?var(--accent):var(--text-muted)`. Draft badge: `text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]`, `background: isActive?rgba(37,99,235,0.18):var(--accent-dim); color: var(--accent)`.
- Bottom items (Notifications, Profile) + Logout pinned via `flex-shrink-0`. Logout uses `nav-hover-danger`, `color: var(--text-muted)` → `var(--danger-text)` on hover (JS onMouseEnter/Leave).
- Compact mode: `.sidebar-compact { --sidebar-width:64px }` hides `.sidebar-label/.sidebar-group-label/.sidebar-logo-text/.sidebar-badge` and centers `.sidebar-item`.

### 8.2 `AppHeader` (`components/layout/AppHeader.tsx`) — mobile/tablet (`lg:hidden`)
- `motion.header` `initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{duration:0.3}}` className `glass-panel lg:hidden sticky top-0 z-20 w-full`, inline `paddingTop: env(safe-area-inset-top,0px); borderBottom:1px solid var(--glass-panel-border); boxShadow: var(--glass-panel-shadow)`.
- Inner row: `flex items-center justify-between w-full`, `height:56`, horizontal padding `max(env(safe-area-inset-left,0px),16px)` / `max(env(safe-area-inset-right,0px),16px)`.
- Logo box: `w-8 h-8 rounded-xl flex items-center justify-center text-[15px]`, same accent gradient/border/shadow as sidebar (boxShadow `rgba(37,99,235,0.10)`). Link has `focus-ring rounded-lg`, `aria-label="LifeFlow home"`.
- Title: `font-semibold truncate min-w-0`, `color: var(--text-primary)`, `fontSize: clamp(13px, 3.8vw, 15px)`, `marginLeft:8px`.
- Action buttons: Search + Bell, each `nav-hover flex items-center justify-center rounded-xl transition-colors focus-ring`, `color: var(--text-muted)`, `width:44 height:44` (44×44 touch target). Bell `aria-label` includes unread count; unread badge `absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white`, `background: var(--accent)`, shows `9+` over 9.

### 8.3 `BottomNav` (`components/layout/BottomNav.tsx`) — mobile/tablet (`lg:hidden`)
- Bar: `nav lg:hidden fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl overflow-hidden`, inline `background: var(--glass-panel-bg); backdropFilter: blur(var(--glass-panel-blur,32px)) saturate(var(--glass-panel-saturate,1.8)); WebkitBackdropFilter: ...; borderTop:1px solid var(--glass-panel-border); boxShadow: '0 -2px 20px rgba(0,0,0,0.08), 0 -1px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.18)'; paddingBottom: env(safe-area-inset-bottom,0px)`, `aria-label="Bottom navigation"`. Note: panel is **not** the `.glass-panel` class here (it would set `position:relative`); tokens are applied inline because the bar is `position:fixed`.
- Inner row: `flex items-stretch`, `height:56`, horizontal safe-area padding.
- 4 main tabs (Home/Tasks/Habits/Expenses) + More. Each `Link flex-1 min-w-0 aria-current={isActive?'page':undefined}`. Inner `motion.div whileTap={{scale:0.88}} transition={{type:'spring',stiffness:500,damping:30}} className="relative flex flex-col items-center justify-center gap-[3px] h-full w-full px-1"`.
- Active pill: `motion.div layoutId="bottom-nav-active-bg" className="absolute inset-x-2 inset-y-1.5 rounded-xl" style={{background:'var(--accent-dim)'}} transition={{type:'spring',stiffness:420,damping:36}}`.
- Icon `size={20}`, `color: isActive?var(--accent):var(--text-muted)`, `strokeWidth: isActive?2.2:1.8`, `className="transition-all duration-150"`. Label `text-[10px] font-semibold leading-none transition-all duration-150 truncate max-w-[52px] text-center`, same color rule, active `letterSpacing:0.01em`.
- More button: `aria-expanded`, `aria-haspopup="dialog"`, `aria-label="More navigation options"`. Opens a fixed popover (`role="dialog" aria-modal="true" aria-label="More navigation"`), `position:fixed; right:max(calc(env(safe-area-inset-right,0px)+8px),8px); bottom:calc(var(--bottomnav-total-height,56px)+8px); zIndex:50; width:fit-content; minWidth:180; maxWidth:calc(100vw - 24px); borderRadius:16;` glass tokens inline (`var(--glass-panel-bg)`, blur 32px saturate 1.8, border, boxShadow `0 8px 40px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.22)`); animate `transition={{duration:0.18, ease:[0.25,0.46,0.45,0.94]}}`. Rows `height:36 minHeight:36 lineHeight:1`, label `text-[13px] font-medium leading-none whitespace-nowrap`. Body sets `data-more-open="true"` while open (hides FAB via CSS). Escape + outside-pointerdown close.

### 8.4 App shell composition (`app/app/layout.tsx`)
```jsx
<div className="app-bg app-shell-min-h flex w-full">
  <Sidebar />
  <div className="sidebar-offset flex-1 flex flex-col min-w-0 w-full">
    <AppHeader />
    <main className="flex-1 min-h-0 w-full pb-mobile-nav lg:pb-8">{children}</main>
  </div>
  <BottomNav />
</div>
```
Auth shell (`app/(auth)/layout.tsx`) is just `<div className="auth-bg">{children}</div>`.

---

## 9. Ambient Backgrounds (verbatim)

```css
.app-bg {
  min-height: 100vh; min-height: 100dvh;
  background:
    radial-gradient(ellipse 65% 55% at 4%   0%,   rgba(59, 130, 246, 0.07)  0%, transparent 62%),
    radial-gradient(ellipse 55% 45% at 96% 100%, rgba(139,  92, 246, 0.055) 0%, transparent 62%),
    radial-gradient(ellipse 45% 40% at 50%  50%,  rgba(255, 255, 255, 0.85) 0%, transparent 72%),
    radial-gradient(ellipse 30% 25% at 80%  20%,  rgba(37,  99, 235, 0.03) 0%, transparent 50%),
    var(--bg-base);
  background-attachment: scroll;
  overflow-x: hidden;
}
@media (hover: hover) and (pointer: fine) { .app-bg { background-attachment: fixed; } }
[data-theme="dark"] .app-bg {
  background:
    radial-gradient(ellipse 65% 55% at 4%   0%,   rgba(59, 130, 246, 0.09) 0%, transparent 62%),
    radial-gradient(ellipse 55% 45% at 96% 100%, rgba(139,  92, 246, 0.07) 0%, transparent 62%),
    radial-gradient(ellipse 45% 40% at 50%  50%,  rgba(20,  22,  40, 0.70) 0%, transparent 72%),
    radial-gradient(ellipse 30% 25% at 80%  20%,  rgba(37,  99, 235, 0.04) 0%, transparent 50%),
    var(--bg-base);
}
.auth-bg {
  min-height:100vh; min-height:100svh; min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:1.5rem; overflow-y:auto;
  background:
    radial-gradient(ellipse 70% 60% at 50% 35%, rgba(59,130,246,0.07) 0%, transparent 65%),
    radial-gradient(ellipse 45% 40% at 15% 80%, rgba(139,92,246,0.04) 0%, transparent 55%),
    radial-gradient(ellipse 45% 40% at 85% 10%, rgba(37,99,235,0.04) 0%, transparent 55%),
    var(--bg-base);
}
```
Auth card body padding: `.auth-card-pad { padding:2rem; } @media (max-width:374px){ .auth-card-pad{ padding:1.25rem; } }`.

---

## 10. Responsive Layout Patterns

**Breakpoints used** (Tailwind defaults): `sm=640`, `md=768`, `lg=1024`, `xl=1280`, `2xl`. Custom `min-width:1440` and `max-width:374`/`max-width:640` media queries in globals.css.

**Sidebar width variants (verbatim):**
```css
:root { --sidebar-width: 252px; }                       /* default */
@media (min-width: 1024px) and (max-width: 1280px) { :root { --sidebar-width: 220px; } }   /* lg–xl */
@media (min-width: 1440px) { :root { --sidebar-width: 268px; } }                          /* xl+ */
.sidebar-compact { --sidebar-width: 64px; }
```
Sidebar shows at `lg+` (1024+); below lg the mobile top bar (`AppHeader`) + bottom nav (`BottomNav`) are used. `.sidebar-offset { padding-left:0; }` and `@media (min-width:1024px){ .sidebar-offset { padding-left: var(--sidebar-width,252px); } }`. Mobile bottom padding: `.pb-mobile-nav { padding-bottom: var(--mobile-nav-pad); }` (= 56px + safe-area + 16px); desktop uses `lg:pb-8`.

**Mobile blur reduction for performance (verbatim):**
```css
@media (max-width: 640px) {
  :root {
    --glass-regular-blur:  14px;
    --glass-elevated-blur:  20px;
    --glass-floating-blur: 26px;
    --glass-panel-blur:    24px;
  }
}
```

**Viewport / safe area** (`app/layout.tsx`): `viewportFit: 'cover'` is required so `env(safe-area-inset-*)` returns non-zero on iOS; `maximumScale:5, userScalable:true` (WCAG 1.4.4 — never lock zoom).

**Card grid utilities (verbatim):**
```css
.grid-cards-2 { display:grid; grid-template-columns:1fr; gap:1rem; }  @media(min-width:640px){ .grid-cards-2{ grid-template-columns:repeat(2,1fr);} }
.grid-cards-3 { 1fr → @640 2fr → @1024 3fr }
.grid-cards-4 { 1fr → @640 2fr → @768 3fr → @1024 4fr }
```
At `max-width:374px`: `--space-card:14px; --space-inner:10px;` and `.app-bg .grid-cols-2:not(.force-2col){ grid-template-columns:1fr; }` (force 1-col on tiny screens).

**Page container / max widths (verbatim):**
```css
.page-container { width:100%; max-width:72rem; margin-left:auto; margin-right:auto; padding-left:1rem; padding-right:1rem; }
@media(min-width:640px){ .page-container{ padding-left:1.5rem; padding-right:1.5rem;} }
@media(min-width:1024px){ .page-container{ padding-left:2rem; padding-right:2rem;} }
@media (min-width: 1440px) { .max-w-6xl { max-width: 80rem; } .max-w-5xl { max-width: 68rem; } }
```
**Bottom sheet / modal responsive:** `.mobile-sheet { position:fixed; bottom:0; left:0; right:0; z-index:45; border-radius:24px 24px 0 0; max-height:80dvh; overflow-y:auto; } @media(min-width:768px){ .mobile-sheet{ position:static; border-radius:var(--radius-lg); max-height:none; } }`. Modal itself: `items-end sm:items-center`, `rounded-t-[28px] sm:rounded-2xl`, `p-0 sm:p-5`, drag handle `sm:hidden`.

**Other responsive utilities present:** `.touch-scroll`, `.flex-row-safe`, `.scroll-x`, `.table-responsive`, `.tabs-scrollable`, `.filter-row` (wrap→nowrap at md), `.action-row` (wrap→nowrap at 480px). `@media (hover: none) { .group .touch-visible { opacity:1 !important; } }` keeps hover-only actions visible on touch devices.

---

## 11. Accessibility Patterns

**Focus ring (verbatim):**
```css
.focus-ring:focus-visible { outline: 2px solid rgba(37, 99, 235, 0.55); outline-offset: 2px; }
```
Applied to interactive elements via the `focus-ring` class (buttons, nav links, logo links, close buttons).

**Active-route signalling:** Sidebar/BottomNav items set `aria-current={isActive ? 'page' : undefined}`. BottomNav More button uses `aria-expanded={moreOpen}` + `aria-haspopup="dialog"` + `aria-label`. More panel is `role="dialog" aria-modal="true" aria-label="More navigation"`. Modal dialog is `role="dialog" aria-modal="true" aria-label={title}`; close button `aria-label="Close"`. Toast region `aria-live="polite" aria-label="Notifications"`. Password-visibility toggle button `aria-label={showPassword?'Hide password':'Show password'}` and `tabIndex={-1}`.

**Touch targets:** `.touch-target { min-width:44px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; }` (Apple HIG 44×44). Header/nav action buttons use explicit `width:44 height:44`. Bottom-nav `whileTap={{scale:0.88}}`.

**Safe-area utilities (verbatim):**
```css
.safe-top    { padding-top:    env(safe-area-inset-top,    0px); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
.safe-left   { padding-left:   env(safe-area-inset-left,   0px); }
.safe-right  { padding-right:  env(safe-area-inset-right,  0px); }
.safe-bottom (alternate) { padding-bottom: max(env(safe-area-inset-bottom), 8px); }
.safe-top    (alternate) { padding-top:    max(env(safe-area-inset-top),    0px); }
```
Header uses `paddingTop: env(safe-area-inset-top,0px)` and `max(env(safe-area-inset-left/right,0px),16px)` for its row. BottomNav uses `paddingBottom: env(safe-area-inset-bottom,0px)`.

**Keyboard:** Modals listen for `Escape` (closes + restores body scroll). More panel listens for `Escape` + outside `pointerdown`. Pinch-zoom allowed (`userScalable:true, maximumScale:5`). `touch-action: manipulation` on `button, a, [role="button"]` (no double-tap delay). `prefers-reduced-motion` collapses all animations/transitions to 0.01ms (see §6.5).

**Color helpers (verbatim) — priority & category:**
```css
.priority-high   { color: var(--danger);  }
.priority-medium { color: var(--warning); }
.priority-low    { color: var(--success); }
.cat-food          { color: #EA580C; }  .cat-transport { color: #2563EB; }
.cat-shopping      { color: #DB2777; }  .cat-bills     { color: #DC2626; }
.cat-entertainment { color: #7C3AED; }  .cat-education { color: #0284C7; }
.cat-health        { color: #16A34A; }  .cat-other     { color: #6B7280; }
```
Scrollbar: `::-webkit-scrollbar { width:4px; height:4px; }` thumb `rgba(0,0,0,0.12)` hover `rgba(0,0,0,0.20)`. Sidebar nav scroll uses `.sidebar-nav-scroll` (thin Firefox + custom 4px WebKit thumb). Divider: `.divider { border:none; height:1px; background: var(--border); }`. Progress ring track `.progress-ring-track { stroke: rgba(0,0,0,0.07); }` fill `stroke: url(#progressGrad)`.

---

## 12. Key File Inventory

| Purpose | Path |
|---|---|
| Tailwind v4 entry + all design tokens + glass classes + responsive/a11y CSS | `app/globals.css` (1653 lines) |
| PostCSS config (Tailwind v4 plugin only) | `postcss.config.mjs` |
| Theme provider (light/dark/night-shift, `data-theme`+`data-night-shift` attrs) | `components/providers/ThemeProvider.tsx` |
| Root layout (pre-paint theme script, viewport/safe-area, ToastProvider) | `app/layout.tsx` |
| App shell (sidebar/header/bottomnav composition) | `app/app/layout.tsx` |
| Auth shell | `app/(auth)/layout.tsx` |
| Desktop sidebar | `components/layout/Sidebar.tsx` |
| Mobile/tablet top bar | `components/layout/AppHeader.tsx` |
| Mobile/tablet bottom nav + More panel | `components/layout/BottomNav.tsx` |
| Glass card (motion) | `components/ui/GlassCard.tsx` |
| Glass surface (non-motion, render-as) | `components/ui/GlassSurface.tsx` |
| Buttons | `components/ui/GlassButton.tsx` |
| Inputs/textarea/select | `components/ui/GlassInput.tsx` |
| Modal + confirm dialog | `components/ui/Modal.tsx` |
| Toast | `components/ui/Toast.tsx` |
| Type defs (AppTheme, AppearancePreferences, DEFAULT_APPEARANCE) | `types/index.ts` |
| Dependencies (next 16.3.4, react 19.2.8, framer-motion ^13, lucide-react ^1.42, tailwindcss ^4) | `package.json` |

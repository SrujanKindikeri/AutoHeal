# Next.js CSS Build Fix — `globals.csssvg`

## Root Cause

The build error:

```
./src/app/globals.csssvg
Module parse failed: Unexpected character '@' (1:0)
@tailwind base;
```

occurred because a file was saved on disk with the name `globals.csssvg` instead of `globals.css`. This caused Next.js (via webpack) to attempt to parse it as an SVG file, which failed on the `@tailwind` directive at line 1.

The likely cause was a filename corruption during a file-system operation — possibly a save-as action that appended `svg` to the name instead of replacing the extension, or an editor/tool that produced the wrong filename.

## State at Time of Fix

When this fix ran, `globals.csssvg` no longer existed on disk. `globals.css` was present with the correct white-theme design tokens and all Tailwind directives intact. The import in `layout.tsx` already read `./globals.css`. There were no other references to `globals.csssvg` in the codebase.

The stale `.next` build cache retained references to the bad filename, causing the error to persist even after the file was corrected. Clearing `.next` and rebuilding resolved the compilation error.

## Files Changed

| File | Change |
|------|--------|
| `frontend/.dockerignore` | Created — excludes `.next`, `node_modules`, `.task`, `*.md`, and other build artifacts from the Docker build context |
| `frontend/Dockerfile` | Updated — switched from `npm run dev` to a proper production build (`npm run build` + `npm start`); added `NEXT_PUBLIC_*` build args |
| `frontend/.next/` | Deleted stale cache (not tracked by git) |

`globals.css`, `layout.tsx`, `tailwind.config.ts`, `postcss.config.mjs`, and all source files were unchanged.

## Verification Results

### `npm run lint`
```
✓ Exit 0 (warnings only — no errors)
  - 2 × @next/next/no-img-element (complete-profile/page.tsx, profile/page.tsx)
  - 1 × react-hooks/exhaustive-deps (AppShell.tsx)
```

### `npx tsc --noEmit`
```
✓ Exit 0 — no type errors
```

### `npm run build`
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (47/47)
✓ Finalizing page optimization
✓ Collecting build traces
Exit 0
```
All 47 routes built. Only the same pre-existing lint warnings appeared; no new errors.

## Docker Restart Result

### Root cause of previous Docker failure
The original Dockerfile used `CMD ["npm", "run", "dev"]` while `docker-compose.yml` injected `NODE_ENV=production`. Running the dev server under a production NODE_ENV is unsupported by Next.js and triggered an `EvalError: Code generation from strings disallowed` in the edge runtime sandbox when the middleware compiled on first request. The old container survived because it had a pre-compiled `.next` cache copied from the host; once that cache was cleared, the container broke.

Additionally, Docker BuildKit failed to transfer the build context because the `.task/` directory (containing large markdown files) was included without a `.dockerignore`.

### Fix applied
1. Added `frontend/.dockerignore` to exclude `.task/`, `.next/`, `node_modules/`, and similar.
2. Updated `frontend/Dockerfile` to run `npm run build` during image build and `npm start` as the entrypoint, eliminating the dev-server-in-production mismatch.

### Build output
```
docker build -t multiflow-frontend:latest ./frontend
  ...
  ✓ Compiled successfully
  ✓ Generating static pages (47/47)
  ✓ Build completed in 156.9s
```

### Container status
```
NAME                 IMAGE                   STATUS
movieflow_frontend   multiflow-frontend      Up — 0.0.0.0:6060->3000/tcp
movieflow_backend    multiflow-backend       Up — 0.0.0.0:8000->8000/tcp
movieflow_postgres   postgres:16-alpine      Up (healthy)
movieflow_redis      redis:7-alpine          Up (healthy)
```

### HTTP verification
`GET http://localhost:6060/login` → **HTTP 200** (7983 bytes)

## Design Preservation

The white Apple-inspired redesign was not modified:
- `globals.css` retains all design tokens (`--background: #FFFFFF`, `--foreground: #1D1D1F`, `--accent: #2563EB`, etc.)
- Tailwind directives (`@tailwind base/components/utilities`) are present
- `tailwind.config.ts` color palette and animation tokens are unchanged
- All `apple-glass-card`, `apple-glass`, and transition utilities are intact

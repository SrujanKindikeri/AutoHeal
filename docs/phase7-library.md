# Phase 7 — Personal Entertainment Library

## 1. Models created

All models live in the new `library` Django app (`backend/library/`).

| Model | Purpose |
|---|---|
| `UserLibraryItem` | Tracks a user's relationship with any content item (movie, TV show, track, album). Stores status, optional personal rating (1–10), and optional private notes. |
| `UserCollection` | Named, optionally public collection owned by a user. |
| `CollectionItem` | An item inside a `UserCollection` with explicit position ordering. |
| `UserFavorite` | Quick-access favorites, independent of library status. |
| `UserFollow` | Follow relationship between a user and a `MusicArtist`. |

### Database constraints
- `unique_user_library_item` — `(user, content_type, object_id)`
- `unique_collection_item` — `(collection, content_type, object_id)`
- `unique_user_favorite` — `(user, content_type, object_id)`
- `unique_user_artist_follow` — `(user, artist_id)`

## 2. Migrations

- `library/migrations/0001_initial.py` — creates all 5 tables, indexes, and unique constraints.
- Applied cleanly with `manage.py migrate`.

## 3. API endpoints

All under `/api/v1/`, authentication required on every endpoint.

### Library

| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/library/` | Overview: counts, recently added, currently watching, completed, collections |
| GET | `/api/v1/library/movies/` | Movie items, filterable by `?status=` |
| GET | `/api/v1/library/shows/` | TV show items, filterable by `?status=` |
| GET | `/api/v1/library/music/` | Music items, filterable by `?content_type=` and `?status=` |
| POST | `/api/v1/library/items/` | Add item (idempotent: returns 200 if already present) |
| PATCH | `/api/v1/library/items/{item_id}/` | Update status, rating, or notes |
| DELETE | `/api/v1/library/items/{item_id}/` | Remove item |

### Collections

| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/collections/` | List user's collections (paginated) |
| POST | `/api/v1/collections/` | Create collection |
| GET | `/api/v1/collections/{id}/` | Detail with items |
| PATCH | `/api/v1/collections/{id}/` | Rename / update description / change privacy |
| DELETE | `/api/v1/collections/{id}/` | Delete (cascades items) |
| POST | `/api/v1/collections/{id}/items/` | Add item (idempotent) |
| DELETE | `/api/v1/collections/{id}/items/{item_id}/` | Remove item |
| POST | `/api/v1/collections/{id}/reorder/` | Reorder items `[{id, position}]` |

### Favorites

| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/favorites/` | List favorites, filterable by `?content_type=` |
| POST | `/api/v1/favorites/` | Add favorite (idempotent) |
| DELETE | `/api/v1/favorites/{id}/` | Remove favorite |

### Artist follows

| Method | URL | Description |
|---|---|---|
| GET | `/api/v1/music/following/artists/` | List followed artists |
| POST | `/api/v1/music/following/artists/` | Follow artist (validates artist exists) |
| DELETE | `/api/v1/music/following/artists/{artist_id}/` | Unfollow |

## 4. Frontend pages

| Route | Description |
|---|---|
| `/library` | Overview: counts, recently added, currently watching, completed, collections preview |
| `/library/movies` | Movie library with status tabs (All / Watchlist / Watching / Watched / Favorites) |
| `/library/shows` | TV show library with status tabs (All / Plan to Watch / Watching / Completed / On Hold / Dropped / Favorites) |
| `/library/music` | Liked Tracks / Saved Albums / Following tabs |
| `/library/favorites` | All favorites, filterable by content type |
| `/library/collections` | Collections grid with create modal and inline delete confirm |
| `/library/collections/[id]` | Collection detail: items list, edit modal, delete confirm, item removal |

**Reusable components** (`src/components/library/LibraryButton.tsx`):
- `LibraryButton` — Add/remove with status dropdown, for use on detail pages
- `FavoriteButton` — Heart toggle
- `FollowArtistButton` — Follow/unfollow with loading state

**API client** (`src/lib/libraryApi.ts`) and hooks (`src/hooks/useLibrary.ts`) follow the existing project conventions.

## 5. Supported content types

| Feature | Movies | TV Shows | Music Tracks | Albums | Artists |
|---|---|---|---|---|---|
| Library items | ✅ | ✅ | ✅ | ✅ | — |
| Collections | ✅ | ✅ | ✅ | ✅ | ✅ |
| Favorites | ✅ | ✅ | ✅ | ✅ | — |
| Follow | — | — | — | — | ✅ |

### Status choices by content type

- **Movie**: `watchlist`, `watching`, `watched`, `favorites`
- **TV show**: `plan_to_watch`, `watching`, `completed`, `on_hold`, `dropped`, `favorites`
- **Music track**: `liked`, `saved`
- **Album**: `saved`

## 6. Privacy and ownership rules

- All library data is private by default; unauthenticated requests receive 401.
- Every queryset is filtered to `user=request.user` before serialization.
- Detail/update/delete views use `get_object_or_404(Model, id=…, user=request.user)` — a different user's item returns 404, not 403, to avoid confirming existence.
- Collections default to `privacy=private`. The `privacy` field controls future public-share features; the backend currently only allows the owner to access any collection.
- Personal `notes` and `personal_rating` fields are only ever returned to the owner.
- `UserCollection` ownership is validated on every collection-item and reorder operation.

## 7. Test results

```
backend/ manage.py test
----------------------------------------------------------------------
Ran 195 tests in 81.015s
OK
```

Previous suite: 152 tests. Phase 7 adds 43 new tests.

### New tests (library app)

**LibraryItemTests** (19)
- Add movie, TV show, music track, album
- Duplicate item returns 200 (idempotent)
- Invalid status for content type returns 400
- Update status
- Update rating and notes
- Remove item
- Cannot edit / delete another user's item → 404
- Unauthenticated add → 401
- Unauthenticated view → 401
- Library movies / shows / music correctly filtered by content_type
- Overview counts accurate

**CollectionTests** (11)
- Create, list, rename, delete
- Cannot edit / delete other user's collection → 404
- Add item, duplicate item returns 200, remove item
- Reorder items (bulk_update verified)
- Deleting collection cascades items
- Unauthenticated create → 401

**FavoriteTests** (7)
- Add, duplicate returns 200, list, remove
- Cannot delete another user's favorite → 404
- Unauthenticated access → 401
- Filter by content_type

**ArtistFollowTests** (6)
- Follow, follow non-existent artist → 404, duplicate returns 200
- List, unfollow
- Other user's follows not visible
- Unauthenticated follow → 401

### Frontend build

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (32/32)
✓ Collecting build traces
```

TypeScript check: `npx tsc --noEmit` — exit 0, no errors.

ESLint: package not installed in this project (pre-existing condition, not introduced by Phase 7). Build proceeds without lint failures.

## 8. Known limitations

- **Detail page wiring**: `LibraryButton`, `FavoriteButton`, and `FollowArtistButton` components are implemented and ready to drop into movie/show/music detail pages, but the existing detail page files were not modified to avoid breaking current integrations. Integration requires passing the content's UUID as `objectId` from the detail page's data fetch.
- **Object ID display**: Library list pages show a truncated UUID rather than the content title because the library model stores only the `object_id`. Full titles would require a join or denormalization; this is a Phase 8 candidate.
- **Drag-and-drop reorder**: The collection detail page shows grip handles and position numbers; the reorder API is fully implemented, but client-side drag-and-drop interaction (e.g. `@dnd-kit`) was not added since it would require installing a new dependency. Reordering via the API is available to callers.
- **Watch/Listen Together integration**: Room creation from a saved title is not wired in this phase per the phase specification.
- **No playback**: No playback or room synchronization implemented, as specified.

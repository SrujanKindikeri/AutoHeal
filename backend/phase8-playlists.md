# Phase 8 — Advanced Playlist Management

## Overview

Playlists let users organize MusicBrainz tracks into named, ordered collections. MovieFlow does not own or control playback of these tracks; playback depends on an authorized provider.

---

## API Endpoints

All endpoints are mounted under `/api/v1/`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `music/playlists/` | Required | List user's playlists (owned + collaborated) |
| POST | `music/playlists/` | Required | Create playlist |
| GET | `music/playlists/discover/` | Optional | Public playlists, paginated. Throttled: 30/min |
| GET | `music/playlists/{id}/` | Conditional | Playlist detail with tracks. Access depends on visibility. |
| PATCH | `music/playlists/{id}/` | Required | Update name, description, artwork_url, visibility |
| DELETE | `music/playlists/{id}/` | Required | Delete playlist (owner only) |
| POST | `music/playlists/{id}/duplicate/` | Required | Duplicate playlist (copy owned by requester) |
| POST | `music/playlists/{id}/reorder/` | Required | Bulk reorder tracks. Body: `[{id, position}]` |
| POST | `music/playlists/{id}/share/` | Required | Get share URL. Throttled: 20/min |
| POST | `music/playlists/{id}/tracks/` | Required | Add track |
| DELETE | `music/playlists/{id}/tracks/{track_mbid}/` | Required | Remove track |
| PATCH | `music/playlists/{id}/tracks/{track_mbid}/reorder/` | Required | Single-track reorder (legacy) |
| GET | `music/playlists/{id}/collaborators/` | Required | List collaborators (owner only) |
| POST | `music/playlists/{id}/collaborators/` | Required | Add collaborator (owner only) |
| PATCH | `music/playlists/{id}/collaborators/{user_id}/` | Required | Change permission (owner only) |
| DELETE | `music/playlists/{id}/collaborators/{user_id}/` | Required | Remove collaborator (owner only) |

---

## Visibility Rules

| Visibility | Who can view | Who can edit |
|------------|-------------|--------------|
| `private` | Owner and all collaborators | Owner and editor-permission collaborators |
| `unlisted` | Anyone with the UUID (including anonymous) | Owner and editor-permission collaborators |
| `public` | Anyone (including anonymous) | Owner and editor-permission collaborators |

---

## Permission Matrix

| Action | Anonymous | Viewer | Editor | Owner |
|--------|-----------|--------|--------|-------|
| View private playlist | ✗ | ✓ | ✓ | ✓ |
| View unlisted playlist | ✓ | ✓ | ✓ | ✓ |
| View public playlist | ✓ | ✓ | ✓ | ✓ |
| Edit metadata | ✗ | ✗ | ✓ | ✓ |
| Add/remove tracks | ✗ | ✗ | ✓ | ✓ |
| Reorder tracks | ✗ | ✗ | ✓ | ✓ |
| Delete playlist | ✗ | ✗ | ✗ | ✓ |
| Manage collaborators | ✗ | ✗ | ✗ | ✓ |
| Duplicate playlist | ✗ | ✓* | ✓* | ✓ |
| Share link | ✗ | ✓† | ✓ | ✓ |

\* Viewer/Editor can duplicate if they have read access.  
† For private playlists, only owner/editor can share. For unlisted/public, anyone with read access can share.

---

## Collaboration Rules

- Only the playlist owner can add, remove, or change the permission of collaborators.
- The owner cannot add themselves as a collaborator.
- A user can be added only once per playlist (`UniqueConstraint` on `playlist + user`).
- Collaborator permissions: `editor` (can edit, cannot delete or manage collaborators) and `viewer` (read-only).
- Revoking access immediately prevents the collaborator from viewing private playlists.

---

## Duplicate-Track Policy

A given `track_mbid` may appear only once per playlist. This is enforced at the database level via `unique_together = [('playlist', 'track_mbid')]` on `PlaylistTrack`. The API returns HTTP 400 if a client attempts to add a duplicate. The same track can appear in different playlists.

Tracks are stored with denormalized metadata (title, artist_name, album_name, duration_ms, artwork_url) at the time of addition. This decouples playlist contents from MusicBrainz data freshness.

---

## Listen Together Integration

The `Playlist` model includes a comment indicating where the future `ListenTogetherRoom` model should reference it:

```python
# Listen Together: when room models are implemented, add an optional playlist FK
# (null=True, blank=True, on_delete=models.SET_NULL) on the room model pointing here.
# Room creation API should validate the requesting user has at least viewer access.
```

The playlist detail page (`/playlists/[id]`) also carries a comment for the frontend room-creation integration point.

---

## Environment Configuration

No new environment variables are required. All playlist functionality uses the existing database, JWT auth, and DRF configuration.

---

## Migration

`music/migrations/0002_phase8_playlist_visibility_collaborators.py`

Changes:
- Added `artwork_url` and `visibility` fields to `Playlist`
- Added `PlaylistCollaborator` model with `UniqueConstraint`
- Added visibility index on `Playlist`

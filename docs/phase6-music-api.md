# Phase 6: Music Discovery API — Endpoint Reference

All endpoints are prefixed with `/api/v1/`.

Music metadata is provided by [MusicBrainz](https://musicbrainz.org) (CC0 open data).  
Cover art is provided by [Cover Art Archive](https://coverartarchive.org).  
No API key is required.

---

## Discovery Endpoints (public, no auth)

### GET /api/v1/music/trending/

Returns a paginated list of trending tracks.

**Query params:** `page` (default: 1), `page_size` (default: 20, max: 20)

**Response:**
```json
{
  "page": 1,
  "total_results": 1000,
  "page_size": 20,
  "results": [
    {
      "mbid": "aaaa-bbbb-cccc",
      "title": "Track Title",
      "duration_ms": 210000,
      "is_explicit": false,
      "artists": [{"mbid": "...", "name": "Artist Name"}],
      "album": {"mbid": "...", "title": "Album Name", "cover_art_url": "https://..."},
      "artwork_url": "https://...",
      "genres": ["rock", "pop"]
    }
  ]
}
```

---

### GET /api/v1/music/popular/

Returns a paginated list of popular artists.

**Query params:** `page`, `page_size`

**Response:**
```json
{
  "page": 1,
  "total_results": 500,
  "page_size": 20,
  "results": [
    {
      "mbid": "aaaa-bbbb-cccc",
      "name": "Artist Name",
      "sort_name": "Name, Artist",
      "genres": ["rock"],
      "disambiguation": ""
    }
  ]
}
```

---

### GET /api/v1/music/new-releases/

Returns a paginated list of new album releases.

**Query params:** `page`, `page_size`

**Response:**
```json
{
  "page": 1,
  "total_results": 1000,
  "page_size": 20,
  "results": [
    {
      "mbid": "aaaa-bbbb-cccc",
      "title": "Album Title",
      "album_type": "album",
      "release_date": "2024-01-15",
      "cover_art_url": "https://...",
      "artists": [{"mbid": "...", "name": "Artist Name"}],
      "genres": []
    }
  ]
}
```

---

### GET /api/v1/music/genres/

Returns the curated list of music genres.

**Response:**
```json
{
  "genres": ["Rock", "Pop", "Jazz", "Classical", "Electronic", "Hip-Hop", "R&B", "Country", "Metal", "Folk", "Blues", "Reggae", "Soul", "Funk", "Punk", "Alternative", "Indie", "Latin", "World", "Ambient"]
}
```

---

### GET /api/v1/music/search/

Search for tracks, artists, or albums.

**Query params:**
- `q` (required, min 2 chars)
- `type`: `track` | `artist` | `album` | `all` (default: `all`)
- `page`, `page_size`

**When type=all, response:**
```json
{
  "artists": [...],
  "albums": [...],
  "tracks": [...]
}
```

**When type=track|artist|album, response:**
```json
{
  "page": 1,
  "total_results": 25,
  "page_size": 20,
  "results": [...]
}
```

**Error (q < 2 chars):** `400 Bad Request`

---

### GET /api/v1/music/tracks/{track_id}/

Returns track detail by MusicBrainz MBID.

**Response:** Track object (same shape as trending results) + enriched `cover_art_url`.

**Errors:** `404` if not found, `502` on provider error.

---

### GET /api/v1/music/albums/{album_id}/

Returns album detail including track listing.

**Response:**
```json
{
  "mbid": "...",
  "title": "...",
  "album_type": "album",
  "release_date": "2024-01-01",
  "cover_art_url": "https://...",
  "artists": [...],
  "genres": [...],
  "tracks": [
    {
      "id": "...",
      "mbid": "...",
      "title": "...",
      "track_number": "1",
      "duration_ms": 210000,
      "artist-credit": [...]
    }
  ]
}
```

---

### GET /api/v1/music/artists/{artist_id}/

Returns artist detail by MBID.

**Response:** Artist object with genres and disambiguation.

---

### GET /api/v1/music/artists/{artist_id}/albums/

Returns paginated list of albums by an artist.

**Query params:** `page`, `page_size`

---

### GET /api/v1/music/artists/{artist_id}/top-tracks/

Returns paginated list of recordings by an artist.

**Query params:** `page`, `page_size`

---

## Playlist Endpoints (requires authentication — Bearer JWT)

### GET /api/v1/music/playlists/

Returns the authenticated user's playlists.

**Response:** Array of playlist objects.

### POST /api/v1/music/playlists/

Creates a new playlist.

**Body:**
```json
{"name": "My Playlist", "description": "Optional description"}
```

**Response:** `201 Created` with playlist object.

---

### GET /api/v1/music/playlists/{playlist_id}/

Returns playlist detail including all tracks.

**Errors:** `403` if not owner, `404` if not found.

### PATCH /api/v1/music/playlists/{playlist_id}/

Renames the playlist.

**Body:** `{"name": "New Name"}`

### DELETE /api/v1/music/playlists/{playlist_id}/

Deletes the playlist.

**Response:** `204 No Content`

---

### POST /api/v1/music/playlists/{playlist_id}/tracks/

Adds a track to the playlist.

**Body:**
```json
{
  "track_mbid": "aaaa-bbbb-cccc",
  "title": "Track Title",
  "artist_name": "Artist Name",
  "album_name": "Album Name",
  "duration_ms": 210000,
  "artwork_url": "https://..."
}
```

**Errors:** `400` if track already in playlist.

### DELETE /api/v1/music/playlists/{playlist_id}/tracks/{track_mbid}/

Removes a track from the playlist.

---

### PATCH /api/v1/music/playlists/{playlist_id}/tracks/{track_mbid}/reorder/

Reorders a track within the playlist.

**Body:** `{"position": 2}`

---

## Attribution Requirements

All music pages must display:
> Music metadata provided by [MusicBrainz](https://musicbrainz.org) (CC0). Cover art from [Cover Art Archive](https://coverartarchive.org).

This is consistent with MusicBrainz's CC0 license and the Cover Art Archive's open data policy.

## Rate Limiting

The backend enforces a minimum 1.1 second gap between MusicBrainz requests (per process). Redis caching with appropriate TTLs prevents redundant requests in production.

## Known Limitations

- MusicBrainz does not expose explicit content flags; `is_explicit` is always `false`.
- Cover art is fetched from Cover Art Archive per release MBID, which requires an additional HTTP call.
- The "trending" and "popular" endpoints use wildcard queries against MusicBrainz which returns results sorted by their internal relevance — not actual play counts.
- MusicBrainz data is community-maintained and may have gaps (missing artwork, biographies, or genres for lesser-known artists).

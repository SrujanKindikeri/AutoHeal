import { apiRequest } from "./authApi";
import type {
  CollaboratorPermission,
  MBAlbum,
  MBAlbumDetail,
  MBArtist,
  MBTrack,
  MusicGenresResponse,
  MusicPaginatedResponse,
  MusicSearchResults,
  Playlist,
  PlaylistCollaborator,
  PlaylistDetail,
  PlaylistPaginatedResponse,
  PlaylistTrack,
  PlaylistVisibility,
} from "@/types/music";

// ── Discovery ─────────────────────────────────────────────────────────────────

export function getMusicTrending(
  page = 1
): Promise<MusicPaginatedResponse<MBTrack>> {
  return apiRequest<MusicPaginatedResponse<MBTrack>>(
    `/api/v1/music/trending/?page=${page}`
  );
}

export function getMusicPopularArtists(
  page = 1
): Promise<MusicPaginatedResponse<MBArtist>> {
  return apiRequest<MusicPaginatedResponse<MBArtist>>(
    `/api/v1/music/popular/?page=${page}`
  );
}

export function getMusicNewReleases(
  page = 1
): Promise<MusicPaginatedResponse<MBAlbum>> {
  return apiRequest<MusicPaginatedResponse<MBAlbum>>(
    `/api/v1/music/new-releases/?page=${page}`
  );
}

export function getMusicGenres(): Promise<MusicGenresResponse> {
  return apiRequest<MusicGenresResponse>("/api/v1/music/genres/");
}

export function searchMusic(
  query: string,
  type: "all" | "track" | "artist" | "album" = "all",
  page = 1
): Promise<MusicSearchResults | MusicPaginatedResponse<MBTrack | MBArtist | MBAlbum>> {
  const params = new URLSearchParams({ q: query, type, page: String(page) });
  return apiRequest(`/api/v1/music/search/?${params.toString()}`);
}

export function getMusicTrack(mbid: string): Promise<MBTrack> {
  return apiRequest<MBTrack>(`/api/v1/music/tracks/${mbid}/`);
}

export function getMusicAlbum(mbid: string): Promise<MBAlbumDetail> {
  return apiRequest<MBAlbumDetail>(`/api/v1/music/albums/${mbid}/`);
}

export function getMusicArtist(mbid: string): Promise<MBArtist> {
  return apiRequest<MBArtist>(`/api/v1/music/artists/${mbid}/`);
}

export function getMusicArtistAlbums(
  mbid: string,
  page = 1
): Promise<MusicPaginatedResponse<MBAlbum>> {
  return apiRequest<MusicPaginatedResponse<MBAlbum>>(
    `/api/v1/music/artists/${mbid}/albums/?page=${page}`
  );
}

export function getMusicArtistTopTracks(
  mbid: string,
  page = 1
): Promise<MusicPaginatedResponse<MBTrack>> {
  return apiRequest<MusicPaginatedResponse<MBTrack>>(
    `/api/v1/music/artists/${mbid}/top-tracks/?page=${page}`
  );
}

// ── Playlists ─────────────────────────────────────────────────────────────────

export function getPlaylists(): Promise<Playlist[]> {
  return apiRequest<Playlist[]>("/api/v1/music/playlists/");
}

export function createPlaylist(data: {
  name: string;
  description?: string;
  visibility?: PlaylistVisibility;
  artwork_url?: string;
}): Promise<Playlist> {
  return apiRequest<Playlist>("/api/v1/music/playlists/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getPlaylist(id: string): Promise<PlaylistDetail> {
  return apiRequest<PlaylistDetail>(`/api/v1/music/playlists/${id}/`);
}

export function updatePlaylist(
  id: string,
  data: Partial<Pick<Playlist, "name" | "description" | "visibility" | "artwork_url">>
): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/v1/music/playlists/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/** @deprecated Use updatePlaylist instead */
export function renamePlaylist(id: string, name: string): Promise<Playlist> {
  return updatePlaylist(id, { name });
}

export function deletePlaylist(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/music/playlists/${id}/`, {
    method: "DELETE",
  });
}

export function duplicatePlaylist(id: string): Promise<Playlist> {
  return apiRequest<Playlist>(`/api/v1/music/playlists/${id}/duplicate/`, {
    method: "POST",
  });
}

export function reorderPlaylistTracks(
  id: string,
  positions: { id: string; position: number }[]
): Promise<void> {
  return apiRequest<void>(`/api/v1/music/playlists/${id}/reorder/`, {
    method: "POST",
    body: JSON.stringify(positions),
  });
}

export function getShareLink(
  id: string
): Promise<{ share_url: string; visibility: PlaylistVisibility }> {
  return apiRequest(`/api/v1/music/playlists/${id}/share/`, { method: "POST" });
}

export function discoverPlaylists(
  page = 1,
  pageSize = 20
): Promise<PlaylistPaginatedResponse> {
  return apiRequest<PlaylistPaginatedResponse>(
    `/api/v1/music/playlists/discover/?page=${page}&page_size=${pageSize}`
  );
}

// ── Playlist tracks ───────────────────────────────────────────────────────────

export function addTrackToPlaylist(
  playlistId: string,
  track: {
    track_mbid: string;
    title: string;
    artist_name: string;
    album_name?: string;
    duration_ms?: number;
    artwork_url?: string;
  }
): Promise<PlaylistTrack> {
  return apiRequest<PlaylistTrack>(
    `/api/v1/music/playlists/${playlistId}/tracks/`,
    {
      method: "POST",
      body: JSON.stringify(track),
    }
  );
}

export function removeTrackFromPlaylist(
  playlistId: string,
  trackMbid: string
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/music/playlists/${playlistId}/tracks/${trackMbid}/`,
    { method: "DELETE" }
  );
}

/** Single-track reorder (legacy endpoint). Prefer reorderPlaylistTracks for bulk. */
export function reorderPlaylistTrack(
  playlistId: string,
  trackMbid: string,
  newPosition: number
): Promise<PlaylistTrack> {
  return apiRequest<PlaylistTrack>(
    `/api/v1/music/playlists/${playlistId}/tracks/${trackMbid}/reorder/`,
    {
      method: "PATCH",
      body: JSON.stringify({ position: newPosition }),
    }
  );
}

// ── Collaborators ─────────────────────────────────────────────────────────────

export function getCollaborators(
  playlistId: string
): Promise<PlaylistCollaborator[]> {
  return apiRequest<PlaylistCollaborator[]>(
    `/api/v1/music/playlists/${playlistId}/collaborators/`
  );
}

export function addCollaborator(
  playlistId: string,
  userId: string,
  permission: CollaboratorPermission
): Promise<PlaylistCollaborator> {
  return apiRequest<PlaylistCollaborator>(
    `/api/v1/music/playlists/${playlistId}/collaborators/`,
    {
      method: "POST",
      body: JSON.stringify({ user_id: userId, permission }),
    }
  );
}

export function updateCollaboratorPermission(
  playlistId: string,
  userId: string,
  permission: CollaboratorPermission
): Promise<PlaylistCollaborator> {
  return apiRequest<PlaylistCollaborator>(
    `/api/v1/music/playlists/${playlistId}/collaborators/${userId}/`,
    {
      method: "PATCH",
      body: JSON.stringify({ permission }),
    }
  );
}

export function removeCollaborator(
  playlistId: string,
  userId: string
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/music/playlists/${playlistId}/collaborators/${userId}/`,
    { method: "DELETE" }
  );
}

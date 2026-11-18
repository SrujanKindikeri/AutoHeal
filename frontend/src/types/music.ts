export interface MBTrack {
  mbid: string;
  title: string;
  duration_ms: number;
  is_explicit: boolean;
  artists: { mbid: string; name: string }[];
  album?: { mbid: string; title: string; cover_art_url: string | null };
  artwork_url: string | null;
  genres: string[];
}

export interface MBAlbum {
  mbid: string;
  title: string;
  album_type: string;
  release_date: string | null;
  cover_art_url: string | null;
  artists: { mbid: string; name: string }[];
  genres: string[];
  track_count?: number;
}

export interface MBAlbumDetail extends MBAlbum {
  tracks: MBTrack[];
}

export interface MBArtist {
  mbid: string;
  name: string;
  sort_name?: string;
  biography?: string;
  image_url?: string | null;
  genres: string[];
  disambiguation?: string;
}

export interface MBArtistDetail extends MBArtist {
  top_tracks?: MBTrack[];
  albums?: MBAlbum[];
}

export interface MusicPaginatedResponse<T> {
  page: number;
  total_results: number;
  page_size: number;
  results: T[];
}

export interface MusicSearchResults {
  artists: MBArtist[];
  albums: MBAlbum[];
  tracks: MBTrack[];
}

export interface MusicGenresResponse {
  genres: string[];
}

export type PlaylistVisibility = "private" | "unlisted" | "public";
export type CollaboratorPermission = "editor" | "viewer";

export interface Playlist {
  id: string;
  owner_username: string;
  name: string;
  description: string;
  artwork_url: string | null;
  visibility: PlaylistVisibility;
  track_count: number;
  total_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface PlaylistDetail extends Playlist {
  tracks: PlaylistTrack[];
}

export interface PlaylistTrack {
  id: string;
  track_mbid: string;
  title: string;
  artist_name: string;
  album_name: string;
  duration_ms: number;
  artwork_url: string | null;
  position: number;
  added_at: string;
}

export interface PlaylistCollaborator {
  id: string;
  user_id: string;
  username: string;
  permission: CollaboratorPermission;
  added_at: string;
}

export interface PlaylistPaginatedResponse {
  page: number;
  total_results: number;
  page_size: number;
  results: Playlist[];
}

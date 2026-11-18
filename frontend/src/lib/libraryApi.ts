import { apiRequest } from "./authApi";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContentType = "movie" | "tvshow" | "music_track" | "album" | "artist";

export type MovieStatus = "watchlist" | "watching" | "watched" | "favorites";
export type TVStatus =
  | "plan_to_watch"
  | "watching"
  | "completed"
  | "on_hold"
  | "dropped"
  | "favorites";
export type MusicStatus = "liked" | "saved";

export interface LibraryItem {
  id: string;
  content_type: ContentType;
  object_id: string;
  status: string;
  added_at: string;
  updated_at: string;
  personal_rating: string | null;
  notes: string;
}

export interface LibraryOverview {
  counts: { movies: number; shows: number; music: number };
  recently_added: LibraryItem[];
  currently_watching: LibraryItem[];
  recently_completed: LibraryItem[];
  collections: UserCollection[];
}

export interface UserCollection {
  id: string;
  name: string;
  description: string;
  cover_image_url: string;
  privacy: "public" | "private";
  created_at: string;
  updated_at: string;
  item_count: number;
}

export interface UserCollectionDetail extends UserCollection {
  items: CollectionItem[];
}

export interface CollectionItem {
  id: string;
  content_type: ContentType;
  object_id: string;
  position: number;
  added_at: string;
}

export interface UserFavorite {
  id: string;
  content_type: ContentType;
  object_id: string;
  created_at: string;
}

export interface UserFollow {
  id: string;
  artist_id: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Library overview ──────────────────────────────────────────────────────────

export function getLibraryOverview(): Promise<LibraryOverview> {
  return apiRequest<LibraryOverview>("/api/v1/library/");
}

// ── Library sub-lists ─────────────────────────────────────────────────────────

export function getLibraryMovies(
  params: { status?: MovieStatus; page?: number } = {}
): Promise<PaginatedResponse<LibraryItem>> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  return apiRequest<PaginatedResponse<LibraryItem>>(
    `/api/v1/library/movies/${q.toString() ? `?${q}` : ""}`
  );
}

export function getLibraryShows(
  params: { status?: TVStatus; page?: number } = {}
): Promise<PaginatedResponse<LibraryItem>> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  return apiRequest<PaginatedResponse<LibraryItem>>(
    `/api/v1/library/shows/${q.toString() ? `?${q}` : ""}`
  );
}

export function getLibraryMusic(
  params: { content_type?: "music_track" | "album"; status?: MusicStatus; page?: number } = {}
): Promise<PaginatedResponse<LibraryItem>> {
  const q = new URLSearchParams();
  if (params.content_type) q.set("content_type", params.content_type);
  if (params.status) q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));
  return apiRequest<PaginatedResponse<LibraryItem>>(
    `/api/v1/library/music/${q.toString() ? `?${q}` : ""}`
  );
}

// ── Library item CRUD ─────────────────────────────────────────────────────────

export function addLibraryItem(data: {
  content_type: ContentType;
  object_id: string;
  status: string;
  personal_rating?: string | null;
  notes?: string;
}): Promise<LibraryItem> {
  return apiRequest<LibraryItem>("/api/v1/library/items/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateLibraryItem(
  itemId: string,
  data: Partial<Pick<LibraryItem, "status" | "personal_rating" | "notes">>
): Promise<LibraryItem> {
  return apiRequest<LibraryItem>(`/api/v1/library/items/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function removeLibraryItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/library/items/${itemId}/`, {
    method: "DELETE",
  });
}

// ── Collections ───────────────────────────────────────────────────────────────

export function getCollections(
  page = 1
): Promise<PaginatedResponse<UserCollection>> {
  return apiRequest<PaginatedResponse<UserCollection>>(
    `/api/v1/collections/?page=${page}`
  );
}

export function createCollection(data: {
  name: string;
  description?: string;
  privacy?: "public" | "private";
}): Promise<UserCollection> {
  return apiRequest<UserCollection>("/api/v1/collections/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getCollection(collectionId: string): Promise<UserCollectionDetail> {
  return apiRequest<UserCollectionDetail>(`/api/v1/collections/${collectionId}/`);
}

export function updateCollection(
  collectionId: string,
  data: Partial<Pick<UserCollection, "name" | "description" | "privacy" | "cover_image_url">>
): Promise<UserCollection> {
  return apiRequest<UserCollection>(`/api/v1/collections/${collectionId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCollection(collectionId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/collections/${collectionId}/`, {
    method: "DELETE",
  });
}

export function addCollectionItem(
  collectionId: string,
  data: { content_type: ContentType; object_id: string; position?: number }
): Promise<CollectionItem> {
  return apiRequest<CollectionItem>(`/api/v1/collections/${collectionId}/items/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeCollectionItem(
  collectionId: string,
  itemId: string
): Promise<void> {
  return apiRequest<void>(`/api/v1/collections/${collectionId}/items/${itemId}/`, {
    method: "DELETE",
  });
}

export function reorderCollectionItems(
  collectionId: string,
  items: { id: string; position: number }[]
): Promise<{ updated: number }> {
  return apiRequest<{ updated: number }>(
    `/api/v1/collections/${collectionId}/reorder/`,
    {
      method: "POST",
      body: JSON.stringify(items),
    }
  );
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export function getFavorites(
  params: { content_type?: ContentType; page?: number } = {}
): Promise<PaginatedResponse<UserFavorite>> {
  const q = new URLSearchParams();
  if (params.content_type) q.set("content_type", params.content_type);
  if (params.page) q.set("page", String(params.page));
  return apiRequest<PaginatedResponse<UserFavorite>>(
    `/api/v1/favorites/${q.toString() ? `?${q}` : ""}`
  );
}

export function addFavorite(data: {
  content_type: ContentType;
  object_id: string;
}): Promise<UserFavorite> {
  return apiRequest<UserFavorite>("/api/v1/favorites/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeFavorite(favoriteId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/favorites/${favoriteId}/`, {
    method: "DELETE",
  });
}

// ── Artist follows ────────────────────────────────────────────────────────────

export function getFollowedArtists(
  page = 1
): Promise<PaginatedResponse<UserFollow>> {
  return apiRequest<PaginatedResponse<UserFollow>>(
    `/api/v1/music/following/artists/?page=${page}`
  );
}

export function followArtist(artistId: string): Promise<UserFollow> {
  return apiRequest<UserFollow>("/api/v1/music/following/artists/", {
    method: "POST",
    body: JSON.stringify({ artist_id: artistId }),
  });
}

export function unfollowArtist(artistId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/music/following/artists/${artistId}/`, {
    method: "DELETE",
  });
}

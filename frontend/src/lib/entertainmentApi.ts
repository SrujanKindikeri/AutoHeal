import { apiRequest } from "./authApi";
import {
  Genre,
  TMDBMovie,
  TMDBTVShow,
  TMDBPaginatedResponse,
  WatchlistItem,
  MediaType,
} from "@/types/entertainment";

// ── Movies ────────────────────────────────────────────────────────────────────

export function getTrendingMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return apiRequest<TMDBPaginatedResponse<TMDBMovie>>(
    `/api/v1/movies/trending/?page=${page}`
  );
}

export function getPopularMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return apiRequest<TMDBPaginatedResponse<TMDBMovie>>(
    `/api/v1/movies/popular/?page=${page}`
  );
}

export function getTopRatedMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return apiRequest<TMDBPaginatedResponse<TMDBMovie>>(
    `/api/v1/movies/top-rated/?page=${page}`
  );
}

export function getNowPlayingMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return apiRequest<TMDBPaginatedResponse<TMDBMovie>>(
    `/api/v1/movies/now-playing/?page=${page}`
  );
}

export function getUpcomingMovies(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return apiRequest<TMDBPaginatedResponse<TMDBMovie>>(
    `/api/v1/movies/upcoming/?page=${page}`
  );
}

export function getMovieDetail(tmdbId: number): Promise<any> {
  return apiRequest<any>(`/api/v1/movies/${tmdbId}/`);
}

// ── TV Shows ──────────────────────────────────────────────────────────────────

export function getTrendingTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return apiRequest<TMDBPaginatedResponse<TMDBTVShow>>(
    `/api/v1/tv/trending/?page=${page}`
  );
}

export function getPopularTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return apiRequest<TMDBPaginatedResponse<TMDBTVShow>>(
    `/api/v1/tv/popular/?page=${page}`
  );
}

export function getTopRatedTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return apiRequest<TMDBPaginatedResponse<TMDBTVShow>>(
    `/api/v1/tv/top-rated/?page=${page}`
  );
}

export function getOnTheAirTV(
  page = 1
): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return apiRequest<TMDBPaginatedResponse<TMDBTVShow>>(
    `/api/v1/tv/on-the-air/?page=${page}`
  );
}

export function getTVDetail(tmdbId: number): Promise<any> {
  return apiRequest<any>(`/api/v1/tv/${tmdbId}/`);
}

// ── Search & Discovery ────────────────────────────────────────────────────────

export function searchContent(
  query: string,
  type: MediaType = "all",
  page = 1
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
  });
  if (type !== "all") {
    params.set("type", type);
  }
  return apiRequest<any>(`/api/v1/entertainment/search/?${params.toString()}`);
}

export function getGenres(type: "movie" | "tv"): Promise<Genre[]> {
  return apiRequest<Genre[]>(
    `/api/v1/entertainment/genres/?type=${type}`
  );
}

export function discoverMedia(
  type: "movie" | "tv",
  options: { genre?: number; sortBy?: string; page?: number } = {}
): Promise<any> {
  const params = new URLSearchParams({ type });
  if (options.genre !== undefined) {
    params.set("genre", String(options.genre));
  }
  if (options.sortBy) {
    params.set("sort_by", options.sortBy);
  }
  params.set("page", String(options.page ?? 1));
  return apiRequest<any>(`/api/v1/entertainment/discover/?${params.toString()}`);
}

// ── Watchlist (auth required) ─────────────────────────────────────────────────

export function getWatchlist(): Promise<WatchlistItem[]> {
  return apiRequest<WatchlistItem[]>("/api/v1/entertainment/watchlist/");
}

export function addToWatchlist(
  item: Omit<WatchlistItem, "id" | "added_at">
): Promise<WatchlistItem> {
  return apiRequest<WatchlistItem>("/api/v1/entertainment/watchlist/", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export function removeFromWatchlist(id: string): Promise<void> {
  return apiRequest<void>(`/api/v1/entertainment/watchlist/${id}/`, {
    method: "DELETE",
  });
}

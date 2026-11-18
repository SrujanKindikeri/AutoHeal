export interface Genre {
  id: number;
  tmdb_id: number;
  name: string;
  media_type: 'movie' | 'tv';
}

export interface TMDBMovie {
  id: number;           // TMDB id
  title: string;
  original_title: string;
  overview: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  original_language: string;
  genre_ids: number[];
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  first_air_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  genre_ids: number[];
}

export interface TMDBPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface WatchlistItem {
  id: string;           // UUID
  media_type: 'movie' | 'tv';
  tmdb_id: number;
  title: string;
  poster_path: string;
  poster_url: string | null;
  added_at: string;
}

export type MediaType = 'movie' | 'tv' | 'all';

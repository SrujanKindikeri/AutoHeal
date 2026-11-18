export interface UserProfile {
  avatar?: string | null;
  avatar_url: string;
  bio: string;
  preferred_movie_genres: string[];
  preferred_music_genres: string[];
  date_of_birth?: string | null;
  is_profile_completed: boolean;
  watch_history_visibility: "public" | "friends_only" | "private";
  listening_history_visibility: "public" | "friends_only" | "private";
  show_activity_status: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  movieflow_id: string;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login?: string | null;
  profile?: UserProfile;
}

export interface PublicUser {
  id: string;
  username: string;
  full_name: string;
  movieflow_id: string;
  avatar_url: string;
  bio: string;
  preferred_movie_genres: string[];
  preferred_music_genres: string[];
  is_profile_completed: boolean;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  message: string;
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    movieflow_id: string;
    is_email_verified: boolean;
  };
}

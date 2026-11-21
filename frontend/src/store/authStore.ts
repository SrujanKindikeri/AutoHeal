import { create } from "zustand";
import { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, access: string, refresh: string) => void;
  setAccessToken: (access: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, access, refresh) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mf_access_token", access);
      localStorage.setItem("mf_refresh_token", refresh);
      localStorage.setItem("mf_user", JSON.stringify(user));
      // HttpOnly cannot be set from JS — this cookie is a navigation-layer signal only; backend JWT validation is independent
      document.cookie = 'mf_auth_present=1; path=/; SameSite=Lax' + (typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '');
    }
    set({
      user,
      accessToken: access,
      refreshToken: refresh,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setAccessToken: (access) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mf_access_token", access);
    }
    set({ accessToken: access });
  },

  updateUser: (user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mf_user", JSON.stringify(user));
    }
    set({ user });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("mf_access_token");
      localStorage.removeItem("mf_refresh_token");
      localStorage.removeItem("mf_user");
      document.cookie = "mf_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initAuth: () => {
    if (typeof window === "undefined") return;

    try {
      const access = localStorage.getItem("mf_access_token");
      const refresh = localStorage.getItem("mf_refresh_token");
      const userStr = localStorage.getItem("mf_user");

      if (access && userStr) {
        const user = JSON.parse(userStr) as User;
        // HttpOnly cannot be set from JS — this cookie is a navigation-layer signal only; backend JWT validation is independent
        document.cookie = 'mf_auth_present=1; path=/; SameSite=Lax' + (typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '');
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));

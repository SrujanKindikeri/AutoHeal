import { API_BASE_URL } from "./api";
import { User, PublicUser, LoginResponse, RegisterResponse } from "@/types/auth";
import { useAuthStore } from "@/store/authStore";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("mf_access_token") : null;
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[API] Network error on", endpoint, networkError instanceof Error ? networkError.message : networkError);
    }
    const err: any = new Error("Unable to connect to the server. Please check your connection.");
    err.status = 0;
    err.data = {};
    throw err;
  }

  // Handle 401 Unauthorized by attempting to refresh token
  if (response.status === 401 && typeof window !== "undefined") {
    const refreshToken = localStorage.getItem("mf_refresh_token");
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.access;
          useAuthStore.getState().setAccessToken(newAccess);

          // Retry original request with new access token
          headers.set("Authorization", `Bearer ${newAccess}`);
          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          // Refresh token also expired/invalid: log out
          useAuthStore.getState().logout();
        }
      } catch {
        useAuthStore.getState().logout();
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (process.env.NODE_ENV === "development") {
      // Log status and non-sensitive response fields — never log passwords or tokens
      const safeData = { ...data };
      delete safeData.password;
      delete safeData.access;
      delete safeData.refresh;
      console.error("[API] Error", response.status, endpoint, safeData);
    }

    // Map status codes to clear user-facing messages
    let userMessage: string;
    if (response.status === 401) {
      userMessage = "Incorrect email/username or password.";
    } else if (response.status === 403) {
      if (data?.code === "ACCOUNT_UNVERIFIED") {
        userMessage = "Your account is not verified. Please check your email.";
      } else {
        userMessage = "You do not have permission to perform this action.";
      }
    } else if (response.status === 400) {
      // Use backend message if present, otherwise generic
      const backendMsg =
        data.error ||
        data.detail ||
        (typeof data === "object" && Object.keys(data).length > 0
          ? Object.entries(data)
              .filter(([k]) => k !== "code")
              .map(([, v]) => (Array.isArray(v) ? v.join(", ") : String(v)))
              .join(" ")
          : null);
      userMessage = backendMsg || "Invalid request. Please check your input.";
    } else if (response.status === 429) {
      userMessage = "Too many attempts. Please wait before trying again.";
    } else if (response.status >= 500) {
      userMessage = "A server error occurred. Please try again later.";
    } else {
      userMessage =
        data.error ||
        data.detail ||
        "An unexpected error occurred. Please try again.";
    }

    const error: any = new Error(userMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// Auth API Methods
export async function registerUser(payload: {
  full_name: string;
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  terms_accepted: boolean;
}): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/api/v1/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(token: string): Promise<{ message: string; user: User }> {
  return apiRequest("/api/v1/auth/verify-email/", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function resendVerification(email: string): Promise<{ message: string }> {
  return apiRequest("/api/v1/auth/resend-verification/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiRequest("/api/v1/auth/forgot-password/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload: {
  token: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ message: string }> {
  return apiRequest("/api/v1/auth/reset-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<{ message: string }> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("mf_refresh_token") : null;
  return apiRequest("/api/v1/auth/logout/", {
    method: "POST",
    body: JSON.stringify({ refresh: refreshToken }),
  });
}

export async function changePassword(payload: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<{ message: string }> {
  return apiRequest("/api/v1/auth/change-password/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Profile API Methods
export async function getProfileMe(): Promise<User> {
  return apiRequest<User>("/api/v1/profile/me/");
}

export async function updateProfileMe(payload: Partial<User["profile"]> & { full_name?: string }): Promise<User> {
  return apiRequest<User>("/api/v1/profile/me/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function searchUsers(query: string): Promise<PublicUser[]> {
  return apiRequest<PublicUser[]>(`/api/v1/users/search/?q=${encodeURIComponent(query)}`);
}

export async function getUserByMovieFlowId(movieflowId: string): Promise<PublicUser> {
  return apiRequest<PublicUser>(`/api/v1/users/by-movieflow-id/${encodeURIComponent(movieflowId)}/`);
}

// Room Invitation API
export interface RoomInvitationData {
  id: string;
  token: string;
  room_name: string;
  inviter: {
    id: string;
    username: string;
    full_name: string;
    movieflow_id: string;
  };
  status: "pending" | "accepted" | "rejected" | "expired" | "revoked";
  expires_at: string;
  is_expired: boolean;
}

export async function getInvitationByToken(token: string): Promise<RoomInvitationData> {
  return apiRequest<RoomInvitationData>(`/api/v1/invitations/${encodeURIComponent(token)}/`);
}

export async function acceptInvitation(token: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/invitations/${encodeURIComponent(token)}/accept/`, {
    method: "POST",
  });
}

export async function rejectInvitation(token: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/invitations/${encodeURIComponent(token)}/reject/`, {
    method: "POST",
  });
}

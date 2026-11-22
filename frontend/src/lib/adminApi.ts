import { apiRequest } from "./authApi";
import { User } from "@/types/auth";

export interface AdminUserListItem {
  id: string;
  email: string;
  username: string;
  full_name: string;
  movieflow_id: string;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface AdminUserDetail extends AdminUserListItem {
  profile?: {
    watch_history_visibility: string;
    listening_history_visibility: string;
    show_activity_status: boolean;
  };
}

export interface PaginatedAdminUsers {
  count: number;
  total_pages: number;
  current_page: number;
  results: AdminUserListItem[];
}

export interface ModerationReport {
  id: string;
  reporter: { id: string; username: string };
  reported_user: { id: string; username: string };
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at?: string | null;
}

export interface PaginatedReports {
  count: number;
  total_pages: number;
  current_page: number;
  results: ModerationReport[];
}

export interface AdminAnalytics {
  total_users: number;
  active_users_today: number;
  new_users_last_7_days: number;
  new_users_last_30_days: number;
  total_friendships: number;
  total_friend_requests_pending: number;
  total_reports_pending: number;
  total_reports_resolved: number;
}

// Admin user management
export async function adminListUsers(
  page = 1,
  search = ""
): Promise<PaginatedAdminUsers> {
  const qs = new URLSearchParams({ page: String(page) });
  if (search) qs.set("q", search);
  return apiRequest<PaginatedAdminUsers>(
    `/api/v1/admin/users/?${qs.toString()}`
  );
}

export async function adminGetUser(userId: string): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/api/v1/admin/users/${userId}/`);
}

export async function adminUpdateUser(
  userId: string,
  payload: Partial<{ is_active: boolean; is_staff: boolean }>
): Promise<AdminUserDetail> {
  return apiRequest<AdminUserDetail>(`/api/v1/admin/users/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteUser(userId: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/admin/users/${userId}/`, {
    method: "DELETE",
  });
}

// Admin moderation
export async function adminListReports(
  page = 1,
  status = ""
): Promise<PaginatedReports> {
  const qs = new URLSearchParams({ page: String(page) });
  if (status) qs.set("status", status);
  return apiRequest<PaginatedReports>(`/api/v1/admin/reports/?${qs.toString()}`);
}

export async function adminResolveReport(
  reportId: string,
  action: "resolve" | "dismiss"
): Promise<ModerationReport> {
  return apiRequest<ModerationReport>(
    `/api/v1/admin/reports/${reportId}/${action}/`,
    { method: "POST" }
  );
}

// Admin analytics
export async function adminGetAnalytics(): Promise<AdminAnalytics> {
  return apiRequest<AdminAnalytics>("/api/v1/admin/analytics/");
}

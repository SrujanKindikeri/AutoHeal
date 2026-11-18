import { apiRequest } from "./authApi";
import {
  Friendship,
  FriendRequest,
  UserBlock,
  SocialUser,
  NotificationItem,
  PaginatedUsers,
} from "@/types/social";

// Friendships API
export async function getFriends(): Promise<Friendship[]> {
  return apiRequest<Friendship[]>("/api/v1/friends/");
}

export async function removeFriend(friendshipId: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/friends/${friendshipId}/`, {
    method: "DELETE",
  });
}

// Friend Requests API
export async function getIncomingRequests(): Promise<FriendRequest[]> {
  return apiRequest<FriendRequest[]>("/api/v1/friends/requests/incoming/");
}

export async function getOutgoingRequests(): Promise<FriendRequest[]> {
  return apiRequest<FriendRequest[]>("/api/v1/friends/requests/outgoing/");
}

export async function sendFriendRequest(target: string): Promise<{
  status: "pending" | "accepted_reciprocal";
  message: string;
  request_id?: string;
  friendship_id?: string;
}> {
  return apiRequest("/api/v1/friends/requests/", {
    method: "POST",
    body: JSON.stringify({ target }),
  });
}

export async function acceptFriendRequest(requestId: string): Promise<{
  message: string;
  friendship: Friendship;
}> {
  return apiRequest(`/api/v1/friends/requests/${requestId}/accept/`, {
    method: "POST",
  });
}

export async function rejectFriendRequest(requestId: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/friends/requests/${requestId}/reject/`, {
    method: "POST",
  });
}

export async function cancelFriendRequest(requestId: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/friends/requests/${requestId}/cancel/`, {
    method: "POST",
  });
}

// User Search & Discovery API
export async function searchSocialUsers(query: string, page = 1): Promise<PaginatedUsers> {
  return apiRequest<PaginatedUsers>(
    `/api/v1/users/search/?q=${encodeURIComponent(query)}&page=${page}`
  );
}

export async function getUserDetail(userId: string): Promise<SocialUser> {
  return apiRequest<SocialUser>(`/api/v1/users/${encodeURIComponent(userId)}/`);
}

// User Blocking API
export async function blockUser(userId: string, reason = ""): Promise<{ message: string }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}/block/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function unblockUser(userId: string): Promise<{ message: string }> {
  return apiRequest(`/api/v1/users/${encodeURIComponent(userId)}/block/`, {
    method: "DELETE",
  });
}

export async function getBlockedUsers(): Promise<UserBlock[]> {
  return apiRequest<UserBlock[]>("/api/v1/users/blocked/");
}

// Notifications API
export async function getNotifications(): Promise<{
  unread_count: number;
  results: NotificationItem[];
}> {
  return apiRequest("/api/v1/notifications/");
}

export async function markNotificationRead(notificationId: string): Promise<NotificationItem> {
  return apiRequest(`/api/v1/notifications/${notificationId}/read/`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return apiRequest("/api/v1/notifications/read-all/", {
    method: "POST",
  });
}

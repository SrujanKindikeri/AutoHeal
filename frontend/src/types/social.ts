import { PublicUser } from "./auth";

export interface SocialUser extends PublicUser {
  relationship_status: "self" | "blocked" | "friends" | "request_sent" | "request_received" | "none";
}

export interface Friendship {
  id: string;
  friend: PublicUser;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender: PublicUser;
  recipient: PublicUser;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface UserBlock {
  id: string;
  blocked_user: PublicUser;
  reason: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  actor: PublicUser | null;
  verb: "friend_request_received" | "friend_request_accepted" | "room_invitation";
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface PaginatedUsers {
  count: number;
  total_pages: number;
  current_page: number;
  results: SocialUser[];
}

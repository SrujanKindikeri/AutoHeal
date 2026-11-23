import { apiRequest } from "./authApi";
import { API_BASE_URL } from "./api";

export type RoomType = "movie" | "music";
export type RoomStatus =
  | "draft"
  | "scheduled"
  | "waiting"
  | "live"
  | "ended"
  | "cancelled";
export type RoomContentType =
  | "movie"
  | "tv_show"
  | "track"
  | "album"
  | "playlist"
  | "personal_movie"
  | "personal_track";

export interface RoomParticipant {
  id: string;
  user: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  movieflow_id: string;
  role: "host" | "co_host" | "participant";
  status: string;
  joined_at: string | null;
  readiness_state: string;
  connection_status: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  room_type: RoomType;
  content_type: RoomContentType;
  content_id: string;
  content_title: string;
  content_artwork_url: string;
  content_metadata: Record<string, unknown>;
  playback_provider: string;
  visibility: "public" | "private";
  status: RoomStatus;
  max_participants: number;
  host: string;
  host_username: string;
  participant_count: number;
  participants: RoomParticipant[];
  scheduled_start_time: string | null;
  actual_start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRoomInput {
  name: string;
  roomType: RoomType;
  /**
   * Real media the room is bound to. `contentId` MUST be the actual media id
   * (a personal-upload UUID) — NOT the room name. The backend authorizes
   * playback by matching `room__content_id` to the real media id, so a room
   * whose content_id is a human string can never play anything.
   */
  contentId: string;
  contentType: RoomContentType;
  contentTitle: string;
  contentArtworkUrl?: string;
  playbackProvider?: string;
  description?: string;
  visibility?: "public" | "private";
  maxParticipants?: number;
}

// POST /api/v1/rooms/ — create a Watch (movie) or Listen (music) room bound to
// real media. The creator is automatically added as the host participant by the
// backend, which lets them immediately invite friends and play the content.
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  return apiRequest<Room>("/api/v1/rooms/", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      room_type: input.roomType,
      content_type: input.contentType,
      content_id: input.contentId,
      content_title: input.contentTitle,
      content_artwork_url: input.contentArtworkUrl || "",
      playback_provider: input.playbackProvider || "personal",
      description: input.description || "",
      visibility: input.visibility || "public",
      max_participants: input.maxParticipants ?? 10,
    }),
  });
}

// POST /api/v1/rooms/{roomId}/invite/ — invite a friend by their user id.
export async function inviteToRoom(
  roomId: string,
  inviteeId: string
): Promise<{ id: string; token: string; status: string }> {
  return apiRequest(`/api/v1/rooms/${encodeURIComponent(roomId)}/invite/`, {
    method: "POST",
    body: JSON.stringify({ invitee_id: inviteeId }),
  });
}

// GET /api/v1/rooms/ — list rooms the authenticated user belongs to.
export async function getMyRooms(): Promise<{ rooms: Room[] }> {
  return apiRequest<{ rooms: Room[] }>("/api/v1/rooms/");
}

// GET /api/v1/rooms/{roomId}/ — room detail (participants must be able to view
// private rooms; anyone may view public rooms).
export async function getRoom(roomId: string): Promise<Room> {
  return apiRequest<Room>(`/api/v1/rooms/${encodeURIComponent(roomId)}/`);
}

// POST /api/v1/rooms/{roomId}/join/ — join a room (no-op if already joined).
export async function joinRoom(roomId: string): Promise<Room> {
  return apiRequest<Room>(`/api/v1/rooms/${encodeURIComponent(roomId)}/join/`, {
    method: "POST",
  });
}

// POST /api/v1/rooms/{roomId}/leave/ — leave a room.
export async function leaveRoom(
  roomId: string
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    `/api/v1/rooms/${encodeURIComponent(roomId)}/leave/`,
    { method: "POST" }
  );
}

/**
 * Absolute URL of the authenticated streaming endpoint for a personal upload
 * bound to a room. The <video>/<audio> element cannot send a Bearer header, so
 * callers fetch this URL with the Authorization header and play the resulting
 * Blob URL (the backend authorizes the request via room participation).
 */
export function personalStreamUrl(
  contentType: RoomContentType,
  contentId: string
): string {
  if (contentType === "personal_movie") {
    return `${API_BASE_URL}/api/v1/library/uploads/movies/${encodeURIComponent(
      contentId
    )}/stream/`;
  }
  if (contentType === "personal_track") {
    return `${API_BASE_URL}/api/v1/library/uploads/tracks/${encodeURIComponent(
      contentId
    )}/stream/`;
  }
  return "";
}

import { apiRequest } from "./authApi";

export interface Room {
  id: string;
  name: string;
  room_type: "movie" | "music";
  status: string;
  host: string;
  host_username: string;
  participant_count: number;
  created_at: string;
}

export interface CreateRoomInput {
  name: string;
  roomType: "movie" | "music";
  description?: string;
  visibility?: "public" | "private";
  maxParticipants?: number;
}

// POST /api/v1/rooms/ — create a Watch (movie) or Listen (music) room.
// The creator is automatically added as the host participant by the backend,
// which lets them immediately invite friends to the room.
export async function createRoom(input: CreateRoomInput): Promise<Room> {
  return apiRequest<Room>("/api/v1/rooms/", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      room_type: input.roomType,
      content_type: input.roomType === "movie" ? "movie" : "track",
      content_id: input.name,
      content_title: input.name,
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

"use client";

import { RoomsHub } from "@/components/rooms/RoomsHub";

/**
 * /watch-together — lists the user's real Watch (movie) rooms and links into
 * the room player. Replaces the previous "coming soon" page that rendered fake
 * demo chat, reactions, and a disabled "New Room" button.
 */
export default function WatchTogetherPage() {
  return <RoomsHub roomType="movie" />;
}

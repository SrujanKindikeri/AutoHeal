"use client";

import { RoomsHub } from "@/components/rooms/RoomsHub";

/**
 * /listen-together — lists the user's real Listen (music) rooms and links into
 * the room player. Previously this route had no page (404); it now mirrors the
 * Watch Together hub for music rooms.
 */
export default function ListenTogetherPage() {
  return <RoomsHub roomType="music" />;
}

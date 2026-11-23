"use client";

import React from "react";
import { Video, Radio, Users, ChevronRight } from "lucide-react";
import { GlassPanel, Badge } from ".";
import type { Room } from "@/lib/roomApi";

export interface RoomCardProps {
  room: Room;
  onOpen: (roomId: string) => void;
}

const STATUS_BADGE: Record<
  Room["status"],
  { variant: "default" | "accent" | "success" | "warning" | "danger" | "gold"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  scheduled: { variant: "gold", label: "Scheduled" },
  waiting: { variant: "accent", label: "Waiting" },
  live: { variant: "success", label: "Live" },
  ended: { variant: "default", label: "Ended" },
  cancelled: { variant: "danger", label: "Cancelled" },
};

/**
 * RoomCard — a single room rendered as an interactive white card. Used on the
 * Home "Upcoming Rooms" section and the Watch/Listen Together hubs. Clicking it
 * opens the room (the parent decides the navigation target).
 */
export const RoomCard: React.FC<RoomCardProps> = ({ room, onOpen }) => {
  const isWatch = room.room_type === "movie";
  const status = STATUS_BADGE[room.status] ?? STATUS_BADGE.waiting;

  return (
    <GlassPanel
      surface="interactive"
      onClick={() => onOpen(room.id)}
      className="p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-md ${
              isWatch
                ? "bg-accent-blue/15 text-accent-blue border-accent-blue/20"
                : "bg-accent-pink/15 text-accent-pink border-accent-pink/20"
            }`}
          >
            {isWatch ? <Video className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-body-md font-bold text-content-primary truncate text-left">
              {room.name}
            </div>
            <div className="text-caption text-content-muted truncate text-left">
              {isWatch ? "Watch Together" : "Listen Together"}
              {room.host_username ? ` · Host ${room.host_username}` : ""}
            </div>
          </div>
        </div>
        <Badge variant={status.variant} size="sm">
          {status.label}
        </Badge>
      </div>

      {room.content_title ? (
        <div className="mt-3 text-body-sm text-content-secondary truncate text-left">
          {isWatch ? "Watching" : "Listening to"}:{" "}
          <span className="font-semibold text-content-primary">{room.content_title}</span>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption text-content-muted">
          <Users className="w-3.5 h-3.5" />
          <span>{room.participant_count} joined</span>
        </div>
        <ChevronRight className="w-4 h-4 text-content-muted group-hover:text-content-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </GlassPanel>
  );
};

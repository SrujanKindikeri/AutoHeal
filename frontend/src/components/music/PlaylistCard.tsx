"use client";

import React from "react";
import Link from "next/link";
import { Music2, Lock, Link2, Globe } from "lucide-react";
import type { Playlist, PlaylistVisibility } from "@/types/music";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const visibilityConfig: Record<
  PlaylistVisibility,
  { icon: React.ReactNode; label: string; color: string }
> = {
  private: {
    icon: <Lock className="w-3 h-3" />,
    label: "Private",
    color: "text-content-muted",
  },
  unlisted: {
    icon: <Link2 className="w-3 h-3" />,
    label: "Unlisted",
    color: "text-amber-700",
  },
  public: {
    icon: <Globe className="w-3 h-3" />,
    label: "Public",
    color: "text-emerald-700",
  },
};

interface PlaylistCardProps {
  playlist: Playlist;
  showOwner?: boolean;
  href?: string;
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  showOwner = false,
  href,
}) => {
  const vis = visibilityConfig[playlist.visibility];
  const dest = href ?? `/playlists/${playlist.id}`;

  return (
    <Link
      href={dest}
      className="group flex items-center gap-4 p-4 rounded-2xl bg-surface-primary/50 border border-border-subtle hover:bg-surface-primary hover:border-border-strong transition-all duration-200"
    >
      {/* Artwork */}
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-primary flex items-center justify-center shrink-0">
        {playlist.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.artwork_url}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music2 className="w-6 h-6 text-content-muted" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-content-primary truncate">
            {playlist.name}
          </span>
          <span className={`flex items-center gap-1 text-xs ${vis.color} shrink-0`}>
            {vis.icon}
            <span className="hidden sm:inline">{vis.label}</span>
          </span>
        </div>
        <div className="text-xs text-content-secondary truncate">
          {playlist.track_count} track{playlist.track_count !== 1 ? "s" : ""}
          {playlist.total_duration_seconds > 0 &&
            ` · ${formatDuration(playlist.total_duration_seconds)}`}
          {showOwner && ` · ${playlist.owner_username}`}
        </div>
      </div>
    </Link>
  );
};

export default PlaylistCard;

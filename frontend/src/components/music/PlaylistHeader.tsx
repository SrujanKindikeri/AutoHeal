"use client";

import React from "react";
import {
  Music2,
  Lock,
  Link2,
  Globe,
  Edit2,
  Share2,
  Copy,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Playlist, PlaylistVisibility } from "@/types/music";

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const visibilityConfig: Record<
  PlaylistVisibility,
  { icon: React.ReactNode; label: string; color: string }
> = {
  private: {
    icon: <Lock className="w-3.5 h-3.5" />,
    label: "Private",
    color: "text-white/50",
  },
  unlisted: {
    icon: <Link2 className="w-3.5 h-3.5" />,
    label: "Unlisted",
    color: "text-amber-400/80",
  },
  public: {
    icon: <Globe className="w-3.5 h-3.5" />,
    label: "Public",
    color: "text-green-400/80",
  },
};

interface PlaylistHeaderProps {
  playlist: Playlist;
  isOwner: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onAddTracks?: () => void;
}

export const PlaylistHeader: React.FC<PlaylistHeaderProps> = ({
  playlist,
  isOwner,
  canEdit,
  onEdit,
  onShare,
  onDuplicate,
  onDelete,
  onAddTracks,
}) => {
  const vis = visibilityConfig[playlist.visibility];

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">
      {/* Artwork */}
      <div className="w-40 h-40 rounded-2xl overflow-hidden bg-white/[0.06] flex items-center justify-center shrink-0 shadow-2xl">
        {playlist.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.artwork_url}
            alt={playlist.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music2 className="w-16 h-16 text-white/20" />
        )}
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Visibility badge */}
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] ${vis.color}`}
        >
          {vis.icon}
          {vis.label}
        </span>

        <h1 className="text-3xl font-bold text-white leading-tight truncate">
          {playlist.name}
        </h1>

        {playlist.description && (
          <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
            {playlist.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/40">
          <span>by {playlist.owner_username}</span>
          <span>·</span>
          <span>
            {playlist.track_count} track
            {playlist.track_count !== 1 ? "s" : ""}
          </span>
          {playlist.total_duration_seconds > 0 && (
            <>
              <span>·</span>
              <span>{formatDuration(playlist.total_duration_seconds)}</span>
            </>
          )}
          <span>·</span>
          <span>
            Updated {new Date(playlist.updated_at).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {canEdit && onAddTracks && (
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={onAddTracks}>
              Add tracks
            </Button>
          )}
          <Button size="sm" variant="glass" leftIcon={<Share2 className="w-3.5 h-3.5" />} onClick={onShare}>
            Share
          </Button>
          <Button size="sm" variant="glass" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={onDuplicate}>
            Duplicate
          </Button>
          {canEdit && (
            <Button size="sm" variant="glass" leftIcon={<Edit2 className="w-3.5 h-3.5" />} onClick={onEdit}>
              Edit
            </Button>
          )}
          {isOwner && onDelete && (
            <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistHeader;

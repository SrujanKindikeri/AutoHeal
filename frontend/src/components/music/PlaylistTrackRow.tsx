"use client";

import React from "react";
import { X, GripVertical, Music2 } from "lucide-react";
import type { PlaylistTrack } from "@/types/music";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlaylistTrackRowProps {
  track: PlaylistTrack;
  position: number;
  onRemove?: () => void;
  dragHandle?: React.ReactNode;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export const PlaylistTrackRow: React.FC<PlaylistTrackRowProps> = ({
  track,
  position,
  onRemove,
  dragHandle,
  isSelected,
  onSelect,
}) => {
  return (
    <div
      className={`group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
        isSelected
          ? "bg-accent-blue/10 border border-accent-blue/20"
          : "hover:bg-black/[0.04]"
      }`}
    >
      {/* Drag handle */}
      {dragHandle && (
        <span className="text-content-muted hover:text-content-secondary cursor-grab active:cursor-grabbing shrink-0">
          {dragHandle}
        </span>
      )}

      {/* Select checkbox */}
      {onSelect !== undefined && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="w-4 h-4 rounded accent-blue-500 shrink-0"
          aria-label={`Select ${track.title}`}
        />
      )}

      {/* Position number */}
      <span className="w-6 text-center text-xs text-content-muted shrink-0 tabular-nums">
        {position + 1}
      </span>

      {/* Artwork */}
      <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-primary flex items-center justify-center shrink-0">
        {track.artwork_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.artwork_url}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music2 className="w-4 h-4 text-content-muted" />
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-content-primary truncate">{track.title}</div>
        <div className="text-xs text-content-secondary truncate">
          {track.artist_name}
          {track.album_name && ` · ${track.album_name}`}
        </div>
      </div>

      {/* Duration */}
      <span className="text-xs text-content-muted tabular-nums shrink-0">
        {formatMs(track.duration_ms)}
      </span>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 text-content-muted hover:text-accent-coral transition-all shrink-0"
          aria-label={`Remove ${track.title}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const DragHandle: React.FC = () => (
  <GripVertical className="w-4 h-4" />
);

export default PlaylistTrackRow;

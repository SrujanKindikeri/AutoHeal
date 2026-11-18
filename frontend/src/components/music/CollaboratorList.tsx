"use client";

import React, { useState } from "react";
import { X, Pencil, Eye } from "lucide-react";
import type { CollaboratorPermission, PlaylistCollaborator } from "@/types/music";

interface CollaboratorListProps {
  collaborators: PlaylistCollaborator[];
  isOwner: boolean;
  onChangePermission?: (
    userId: string,
    permission: CollaboratorPermission
  ) => Promise<void>;
  onRemove?: (userId: string) => Promise<void>;
}

export const CollaboratorList: React.FC<CollaboratorListProps> = ({
  collaborators,
  isOwner,
  onChangePermission,
  onRemove,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePermissionChange = async (
    userId: string,
    permission: CollaboratorPermission
  ) => {
    if (!onChangePermission) return;
    setLoadingId(userId);
    try {
      await onChangePermission(userId, permission);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!onRemove) return;
    setLoadingId(userId);
    try {
      await onRemove(userId);
    } finally {
      setLoadingId(null);
    }
  };

  if (collaborators.length === 0) {
    return (
      <p className="text-sm text-white/40 py-4">No collaborators yet.</p>
    );
  }

  return (
    <div className="space-y-1">
      {collaborators.map((collab) => (
        <div
          key={collab.id}
          className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors"
        >
          {/* Avatar initials */}
          <div className="w-8 h-8 rounded-full bg-white/[0.1] flex items-center justify-center text-xs font-medium text-white/70 shrink-0">
            {collab.username.slice(0, 2).toUpperCase()}
          </div>

          {/* Username */}
          <span className="flex-1 text-sm text-white/80 truncate">
            {collab.username}
          </span>

          {/* Permission badge / selector */}
          {isOwner && onChangePermission ? (
            <select
              value={collab.permission}
              disabled={loadingId === collab.user_id}
              onChange={(e) =>
                handlePermissionChange(
                  collab.user_id,
                  e.target.value as CollaboratorPermission
                )
              }
              className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/60 rounded-lg px-2 py-1 focus:outline-none disabled:opacity-50"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
          ) : (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                collab.permission === "editor"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-white/[0.06] text-white/40"
              }`}
            >
              {collab.permission === "editor" ? (
                <Pencil className="w-2.5 h-2.5" />
              ) : (
                <Eye className="w-2.5 h-2.5" />
              )}
              {collab.permission === "editor" ? "Editor" : "Viewer"}
            </span>
          )}

          {/* Remove button */}
          {isOwner && onRemove && (
            <button
              onClick={() => handleRemove(collab.user_id)}
              disabled={loadingId === collab.user_id}
              className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
              aria-label={`Remove ${collab.username}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default CollaboratorList;

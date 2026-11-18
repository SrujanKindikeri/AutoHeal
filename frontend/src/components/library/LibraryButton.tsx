"use client";

import React, { useState } from "react";
import { BookmarkPlus, BookmarkCheck, Heart, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  addLibraryItem,
  removeLibraryItem,
  addFavorite,
  removeFavorite,
  followArtist,
  unfollowArtist,
  ContentType,
} from "@/lib/libraryApi";

// ── Add-to-Library button ─────────────────────────────────────────────────────

interface LibraryButtonProps {
  contentType: ContentType;
  objectId: string;
  defaultStatus: string;
  statusOptions: { value: string; label: string }[];
  initialItemId?: string | null;
  initialStatus?: string | null;
  className?: string;
}

export function LibraryButton({
  contentType,
  objectId,
  defaultStatus,
  statusOptions,
  initialItemId = null,
  initialStatus = null,
  className = "",
}: LibraryButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [itemId, setItemId] = useState<string | null>(initialItemId);
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isAuthenticated) return null;

  const handleAdd = async () => {
    setLoading(true);
    try {
      const item = await addLibraryItem({ content_type: contentType, object_id: objectId, status: defaultStatus });
      setItemId(item.id);
      setStatus(item.status);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setShowDropdown(false);
    if (!itemId) return;
    setLoading(true);
    try {
      const { updateLibraryItem } = await import("@/lib/libraryApi");
      const updated = await updateLibraryItem(itemId, { status: newStatus });
      setStatus(updated.status);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      await removeLibraryItem(itemId);
      setItemId(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  if (!itemId) {
    return (
      <button
        onClick={handleAdd}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white/70 hover:text-white text-sm font-medium transition-colors disabled:opacity-40 ${className}`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}
        Add to Library
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="inline-flex rounded-2xl overflow-hidden border border-white/[0.12]">
        <button
          onClick={() => setShowDropdown((s) => !s)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
          <span className="capitalize">{(status ?? "saved").replace(/_/g, " ")}</span>
          <span className="text-blue-300/50 ml-0.5">▾</span>
        </button>
        <button
          onClick={handleRemove}
          disabled={loading}
          className="px-2 py-2 bg-white/[0.04] hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors border-l border-white/[0.1]"
          title="Remove from library"
        >
          ✕
        </button>
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1.5 z-30 w-44 bg-[#1e1e22] border border-white/[0.1] rounded-2xl shadow-xl overflow-hidden">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                status === opt.value
                  ? "text-blue-300 bg-blue-500/10"
                  : "text-white/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Favorite button ───────────────────────────────────────────────────────────

interface FavoriteButtonProps {
  contentType: ContentType;
  objectId: string;
  initialFavoriteId?: string | null;
  className?: string;
}

export function FavoriteButton({
  contentType,
  objectId,
  initialFavoriteId = null,
  className = "",
}: FavoriteButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [favoriteId, setFavoriteId] = useState<string | null>(initialFavoriteId);
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      if (favoriteId) {
        await removeFavorite(favoriteId);
        setFavoriteId(null);
      } else {
        const fav = await addFavorite({ content_type: contentType, object_id: objectId });
        setFavoriteId(fav.id);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={favoriteId ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl transition-colors disabled:opacity-40 ${
        favoriteId
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
          : "bg-white/[0.06] text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08]"
      } ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${favoriteId ? "fill-current" : ""}`} />}
    </button>
  );
}

// ── Follow artist button ──────────────────────────────────────────────────────

interface FollowArtistButtonProps {
  artistId: string;
  initialFollowId?: string | null;
  className?: string;
}

export function FollowArtistButton({
  artistId,
  initialFollowId = null,
  className = "",
}: FollowArtistButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [followId, setFollowId] = useState<string | null>(initialFollowId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const toggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (followId) {
        await unfollowArtist(artistId);
        setFollowId(null);
      } else {
        const follow = await followArtist(artistId);
        setFollowId(follow.id);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={toggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-medium transition-colors disabled:opacity-40 ${
          followId
            ? "bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
            : "bg-white/[0.06] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] hover:text-white"
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : followId ? (
          <UserCheck className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {followId ? "Following" : "Follow"}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

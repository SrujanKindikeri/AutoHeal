"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuthStore } from "@/store/authStore";

interface WatchlistButtonProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  tmdbId,
  mediaType,
  title,
  posterPath,
}) => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, loading: listLoading, add, remove, isInWatchlist } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const [signInPrompt, setSignInPrompt] = useState(false);

  const inList = isInWatchlist(tmdbId, mediaType);
  // Find the watchlist entry id for removal
  const entry = items.find(
    (i) => i.tmdb_id === tmdbId && i.media_type === mediaType
  );

  const handleClick = async () => {
    if (!isAuthenticated) {
      setSignInPrompt(true);
      return;
    }
    setSignInPrompt(false);
    setBusy(true);
    try {
      if (inList && entry) {
        await remove(entry.id);
      } else {
        await add({
          media_type: mediaType,
          tmdb_id: tmdbId,
          title,
          poster_path: posterPath ?? "",
          poster_url: null,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const isDisabled = busy || listLoading;

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={inList ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
        aria-pressed={inList}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-md font-semibold border transition-all duration-200 select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${
          inList
            ? "bg-accent-blue/15 text-accent-blue border-accent-blue/30 hover:bg-accent-coral/15 hover:text-accent-coral hover:border-accent-coral/30"
            : "bg-surface-elevated text-content-secondary border-border-glass hover:bg-surface-glass hover:text-content-primary hover:border-border-strong"
        }`}
      >
        {isDisabled ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : inList ? (
          <BookmarkCheck className="w-4 h-4 shrink-0 fill-current" />
        ) : (
          <Bookmark className="w-4 h-4 shrink-0" />
        )}
        {inList ? "In Watchlist" : "Add to Watchlist"}
      </button>

      {/* Unauthenticated prompt */}
      {signInPrompt && (
        <p className="text-body-sm text-content-muted">
          <button
            onClick={() => router.push("/login")}
            className="text-accent-blue hover:underline font-medium"
          >
            Sign in
          </button>{" "}
          to save to your watchlist.
        </p>
      )}
    </div>
  );
};

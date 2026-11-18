"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/entertainmentApi";
import { WatchlistItem } from "@/types/entertainment";

interface UseWatchlistReturn {
  items: WatchlistItem[];
  loading: boolean;
  error: string | null;
  add: (item: Omit<WatchlistItem, "id" | "added_at">) => Promise<void>;
  remove: (id: string) => Promise<void>;
  isInWatchlist: (tmdbId: number, mediaType: "movie" | "tv") => boolean;
}

export function useWatchlist(): UseWatchlistReturn {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getWatchlist()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Failed to load watchlist");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const add = useCallback(
    async (item: Omit<WatchlistItem, "id" | "added_at">) => {
      setError(null);
      try {
        const created = await addToWatchlist(item);
        setItems((prev) => [...prev, created]);
      } catch (err: any) {
        setError(err.message ?? "Failed to add to watchlist");
        throw err;
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    setError(null);
    try {
      await removeFromWatchlist(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      setError(err.message ?? "Failed to remove from watchlist");
      throw err;
    }
  }, []);

  const isInWatchlist = useCallback(
    (tmdbId: number, mediaType: "movie" | "tv") =>
      items.some((i) => i.tmdb_id === tmdbId && i.media_type === mediaType),
    [items]
  );

  return { items, loading, error, add, remove, isInWatchlist };
}

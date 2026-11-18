"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import {
  addLibraryItem,
  updateLibraryItem,
  removeLibraryItem,
  addFavorite,
  removeFavorite,
  followArtist,
  unfollowArtist,
  getFavorites,
  getFollowedArtists,
  ContentType,
  UserFavorite,
  UserFollow,
} from "@/lib/libraryApi";

// ---------------------------------------------------------------------------
// useLibraryItem — single-item state for a detail page button
// ---------------------------------------------------------------------------

interface LibraryItemState {
  itemId: string | null;
  status: string | null;
  loading: boolean;
  error: string | null;
}

export function useLibraryItem(contentType: ContentType, objectId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [state, setState] = useState<LibraryItemState>({
    itemId: null,
    status: null,
    loading: false,
    error: null,
  });

  const add = useCallback(
    async (status: string) => {
      if (!isAuthenticated) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const item = await addLibraryItem({ content_type: contentType, object_id: objectId, status });
        setState({ itemId: item.id, status: item.status, loading: false, error: null });
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message ?? "Failed" }));
        throw err;
      }
    },
    [isAuthenticated, contentType, objectId]
  );

  const update = useCallback(
    async (newStatus: string) => {
      if (!state.itemId) return add(newStatus);
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const item = await updateLibraryItem(state.itemId, { status: newStatus });
        setState((s) => ({ ...s, status: item.status, loading: false }));
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message ?? "Failed" }));
        throw err;
      }
    },
    [state.itemId, add]
  );

  const remove = useCallback(async () => {
    if (!state.itemId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await removeLibraryItem(state.itemId);
      setState({ itemId: null, status: null, loading: false, error: null });
    } catch (err: any) {
      setState((s) => ({ ...s, loading: false, error: err.message ?? "Failed" }));
      throw err;
    }
  }, [state.itemId]);

  return { ...state, add, update, remove, inLibrary: state.itemId !== null };
}

// ---------------------------------------------------------------------------
// useFavorite — single-item favorite toggle
// ---------------------------------------------------------------------------

export function useFavorite(contentType: ContentType, objectId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated, favoriteId, contentType, objectId]);

  return { isFavorite: favoriteId !== null, favoriteId, loading, toggle, setFavoriteId };
}

// ---------------------------------------------------------------------------
// useArtistFollow — follow/unfollow toggle for a single artist
// ---------------------------------------------------------------------------

export function useArtistFollow(artistId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [followId, setFollowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    if (!isAuthenticated) return;
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
  }, [isAuthenticated, followId, artistId]);

  return { isFollowing: followId !== null, followId, loading, error, toggle, setFollowId };
}

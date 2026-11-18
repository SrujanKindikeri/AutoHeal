"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { discoverPlaylists } from "@/lib/musicApi";
import type { Playlist } from "@/types/music";

export default function DiscoverPlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    discoverPlaylists(1)
      .then((data) => {
        setPlaylists(data.results);
        setTotalResults(data.total_results);
        setPage(1);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load playlists")
      )
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await discoverPlaylists(page + 1);
      setPlaylists((prev) => [...prev, ...data.results]);
      setPage((p) => p + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = playlists.length < totalResults;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-white/40" />
            <div>
              <h1 className="text-2xl font-bold text-white">Discover Playlists</h1>
              <p className="text-sm text-white/40">
                {totalResults > 0 ? `${totalResults} public playlists` : "Public playlists"}
              </p>
            </div>
          </div>
          <Link href="/playlists">
            <Button size="sm" variant="glass">My Playlists</Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : playlists.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Globe className="w-12 h-12 text-white/20 mx-auto" />
            <p className="text-white/40">No public playlists yet.</p>
            <Link href="/playlists/create">
              <Button size="sm" variant="glass">Create the first one</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {playlists.map((pl) => (
                <PlaylistCard key={pl.id} playlist={pl} showOwner />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="glass"
                  isLoading={loadingMore}
                  onClick={loadMore}
                >
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

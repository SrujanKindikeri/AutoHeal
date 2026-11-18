"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ListMusic } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { PlaylistCard } from "@/components/music/PlaylistCard";
import { useAuthStore } from "@/store/authStore";
import { getPlaylists } from "@/lib/musicApi";
import type { Playlist } from "@/types/music";

export default function PlaylistsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    getPlaylists()
      .then(setPlaylists)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load playlists")
      )
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const owned = playlists.filter((p) => p.owner_username === user?.username);
  const shared = playlists.filter((p) => p.owner_username !== user?.username);
  const recent = [...playlists]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <ListMusic className="w-12 h-12 text-white/20 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Your Playlists</h1>
          <p className="text-white/50">Sign in to create and manage playlists.</p>
          <Link href="/login">
            <Button variant="primary">Sign in</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Playlists</h1>
          <Link href="/playlists/create">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              New playlist
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Recently updated */}
            {recent.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                  Recently Updated
                </h2>
                <div className="space-y-2">
                  {recent.map((pl) => (
                    <PlaylistCard key={pl.id} playlist={pl} showOwner={pl.owner_username !== user?.username} />
                  ))}
                </div>
              </section>
            )}

            {/* My playlists */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                My Playlists ({owned.length})
              </h2>
              {owned.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <ListMusic className="w-10 h-10 text-white/20 mx-auto" />
                  <p className="text-white/40">No playlists yet.</p>
                  <Link href="/playlists/create">
                    <Button size="sm" variant="glass">Create your first playlist</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {owned.map((pl) => (
                    <PlaylistCard key={pl.id} playlist={pl} />
                  ))}
                </div>
              )}
            </section>

            {/* Shared with me */}
            {shared.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                  Shared With Me ({shared.length})
                </h2>
                <div className="space-y-2">
                  {shared.map((pl) => (
                    <PlaylistCard key={pl.id} playlist={pl} showOwner />
                  ))}
                </div>
              </section>
            )}

            {/* Discover link */}
            <div className="pt-4 text-center">
              <Link href="/playlists/discover" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                Discover public playlists →
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

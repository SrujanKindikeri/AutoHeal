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
          <ListMusic className="w-12 h-12 text-content-muted mx-auto" />
          <h1 className="text-2xl font-bold text-content-primary">Your Playlists</h1>
          <p className="text-content-muted">Sign in to create and manage playlists.</p>
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
          <h1 className="text-2xl font-bold text-content-primary">Playlists</h1>
          <Link href="/playlists/create">
            <Button size="sm" variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              New playlist
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-surface-primary/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Recently updated */}
            {recent.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
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
              <h2 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
                My Playlists ({owned.length})
              </h2>
              {owned.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <ListMusic className="w-10 h-10 text-content-muted mx-auto" />
                  <p className="text-content-muted">No playlists yet.</p>
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
                <h2 className="text-sm font-semibold text-content-muted uppercase tracking-wider">
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
              <Link href="/playlists/discover" className="text-sm text-accent-blue hover:text-accent-blue transition-colors">
                Discover public playlists →
              </Link>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

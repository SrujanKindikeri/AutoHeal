"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Tv2, Music2, Heart, FolderOpen, Clock, Eye, CheckCircle } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getLibraryOverview, LibraryOverview } from "@/lib/libraryApi";

function StatCard({ icon, label, value, href }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 p-5 rounded-2xl bg-surface-primary/60 border border-border-subtle hover:bg-surface-primary transition-colors"
    >
      <div className="text-accent-blue">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-content-primary">{value}</div>
        <div className="text-sm text-content-secondary mt-0.5">{label}</div>
      </div>
    </Link>
  );
}

function ItemRow({ item }: { item: { content_type: string; object_id: string; status: string; added_at: string } }) {
  const labels: Record<string, string> = {
    movie: "Movie",
    tvshow: "TV Show",
    music_track: "Track",
    album: "Album",
    artist: "Artist",
  };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-primary flex items-center justify-center shrink-0 text-content-muted">
        {item.content_type === "movie" ? <Film className="w-4 h-4" /> :
          item.content_type === "tvshow" ? <Tv2 className="w-4 h-4" /> :
            <Music2 className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-content-primary truncate">{labels[item.content_type] ?? item.content_type}</div>
        <div className="text-xs text-content-muted capitalize">{item.status.replace(/_/g, " ")}</div>
      </div>
      <div className="text-xs text-content-muted shrink-0">
        {new Date(item.added_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [overview, setOverview] = useState<LibraryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    getLibraryOverview()
      .then(setOverview)
      .catch((e) => setError(e.message ?? "Failed to load library"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-content-primary mb-2">Your Library</h1>
          <p className="text-content-secondary mb-6">Sign in to access your personal entertainment library.</p>
          <Link href="/login" className="inline-flex items-center px-5 py-2.5 rounded-2xl bg-accent-blue hover:bg-accent-blue-hover text-white font-semibold transition-colors">
            Sign In
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-content-primary">My Library</h1>
          <p className="text-content-muted mt-1">Your personal entertainment collection</p>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2">
          {[            { label: "Movies", href: "/library/movies" },
            { label: "Shows", href: "/library/shows" },
            { label: "Music", href: "/library/music" },
            { label: "Favorites", href: "/library/favorites" },
            { label: "Collections", href: "/library/collections" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-surface-primary hover:bg-surface-primary/70 text-content-secondary hover:text-content-primary transition-colors border border-border-subtle"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-surface-primary/60 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral">{error}</div>
        ) : overview ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={<Film className="w-5 h-5" />} label="Movies saved" value={overview.counts.movies} href="/library/movies" />
              <StatCard icon={<Tv2 className="w-5 h-5" />} label="Shows saved" value={overview.counts.shows} href="/library/shows" />
              <StatCard icon={<Music2 className="w-5 h-5" />} label="Music saved" value={overview.counts.music} href="/library/music" />
              <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Collections" value={overview.collections.length} href="/library/collections" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recently added */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-primary/50 border border-border-subtle">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-content-muted" />
                  <h2 className="font-semibold text-content-primary">Recently Added</h2>
                </div>
                {overview.recently_added.length === 0 ? (
                  <p className="text-sm text-content-muted py-4">Nothing added yet.</p>
                ) : (
                  <div>
                    {overview.recently_added.slice(0, 8).map((item) => (
                      <ItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              {/* Currently watching + completed */}
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-surface-primary/50 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-accent-blue" />
                    <h2 className="font-semibold text-content-primary text-sm">Currently Watching</h2>
                  </div>
                  {overview.currently_watching.length === 0 ? (
                    <p className="text-xs text-content-muted">Nothing in progress.</p>
                  ) : (
                    <div>
                      {overview.currently_watching.slice(0, 5).map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-5 rounded-2xl bg-surface-primary/50 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-semibold text-content-primary text-sm">Recently Completed</h2>
                  </div>
                  {overview.recently_completed.length === 0 ? (
                    <p className="text-xs text-content-muted">Nothing completed yet.</p>
                  ) : (
                    <div>
                      {overview.recently_completed.slice(0, 5).map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Collections preview */}
            {overview.collections.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-content-primary">Collections</h2>
                  <Link href="/library/collections" className="text-sm text-accent-blue hover:text-accent-blue">View all</Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {overview.collections.map((col) => (
                    <Link
                      key={col.id}
                      href={`/library/collections/${col.id}`}
                      className="p-4 rounded-2xl bg-surface-primary/60 border border-border-subtle hover:bg-surface-primary transition-colors"
                    >
                      <div className="text-sm font-medium text-content-primary truncate">{col.name}</div>
                      <div className="text-xs text-content-muted mt-1">{col.item_count} items</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

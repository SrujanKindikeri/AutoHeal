"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Film, Tv2, Music2, Trash2 } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getFavorites, removeFavorite, UserFavorite, ContentType } from "@/lib/libraryApi";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  movie: <Film className="w-4 h-4" />,
  tvshow: <Tv2 className="w-4 h-4" />,
  music_track: <Music2 className="w-4 h-4" />,
  album: <Music2 className="w-4 h-4" />,
  artist: <Music2 className="w-4 h-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tvshow: "TV Show",
  music_track: "Track",
  album: "Album",
  artist: "Artist",
};

const FILTER_TABS: { label: string; value: ContentType | "" }[] = [
  { label: "All", value: "" },
  { label: "Movies", value: "movie" },
  { label: "Shows", value: "tvshow" },
  { label: "Tracks", value: "music_track" },
  { label: "Albums", value: "album" },
];

export default function FavoritesPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [filter, setFilter] = useState<ContentType | "">("");
  const [items, setItems] = useState<UserFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    getFavorites({ content_type: filter || undefined })
      .then((r) => setItems(r.results))
      .catch((e) => setError(e.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, filter]);

  const handleRemove = async (id: string) => {
    await removeFavorite(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setConfirmId(null);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/library" className="text-content-muted hover:text-content-secondary text-sm">← Library</Link>
          <h1 className="text-2xl font-bold text-content-primary flex items-center gap-2">
            <Heart className="w-6 h-6 text-accent-coral" /> Favorites
          </h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 bg-surface-primary/60 rounded-2xl w-fit">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                filter === tab.value ? "bg-white text-content-primary shadow-sm" : "text-content-muted hover:text-content-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-primary/60 animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Heart className="w-12 h-12 text-content-muted mx-auto mb-3" />
            <p className="text-content-muted">No favorites {filter ? `of type "${TYPE_LABELS[filter] ?? filter}"` : ""} yet.</p>
          </div>
        ) : (
          <div className="bg-surface-primary/50 border border-border-subtle rounded-2xl px-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3.5 border-b border-border-subtle last:border-0">
                <div className="text-content-muted">{TYPE_ICONS[item.content_type] ?? <Heart className="w-4 h-4" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-content-primary truncate font-medium">
                    {TYPE_LABELS[item.content_type] ?? item.content_type} — {item.object_id.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-content-muted">{new Date(item.created_at).toLocaleDateString()}</div>
                </div>
                {confirmId === item.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleRemove(item.id)} className="text-xs px-2 py-1 rounded-lg bg-accent-coral/20 text-accent-coral hover:bg-accent-coral/30">Remove</button>
                    <button onClick={() => setConfirmId(null)} className="text-xs px-2 py-1 rounded-lg bg-surface-primary text-content-muted hover:bg-surface-primary/70">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(item.id)} className="text-content-muted hover:text-accent-coral transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

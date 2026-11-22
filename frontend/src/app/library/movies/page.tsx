"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getLibraryMovies, removeLibraryItem, updateLibraryItem, LibraryItem, MovieStatus } from "@/lib/libraryApi";
import Link from "next/link";
import { Trash2, Star } from "lucide-react";

const TABS: { label: string; value: MovieStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Watchlist", value: "watchlist" },
  { label: "Watching", value: "watching" },
  { label: "Watched", value: "watched" },
  { label: "Favorites", value: "favorites" },
];

const STATUS_OPTIONS: MovieStatus[] = ["watchlist", "watching", "watched", "favorites"];

function MovieItemRow({
  item,
  onRemove,
  onStatusChange,
}: {
  item: LibraryItem;
  onRemove: (id: string) => void;
  onStatusChange: (id: string, status: MovieStatus) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updating, setUpdating] = useState(false);

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-border-subtle last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-content-primary truncate font-medium">
          Movie ID: {item.object_id.slice(0, 8)}…
        </div>
        <div className="text-xs text-content-muted mt-0.5">
          Added {new Date(item.added_at).toLocaleDateString()}
          {item.personal_rating && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-700">
              <Star className="w-3 h-3" /> {item.personal_rating}
            </span>
          )}
        </div>
      </div>
      <select
        value={item.status}
        disabled={updating}
        onChange={async (e) => {
          setUpdating(true);
          try { await onStatusChange(item.id, e.target.value as MovieStatus); }
          finally { setUpdating(false); }
        }}
        className="text-xs bg-surface-primary border border-border-glass rounded-xl px-2 py-1 text-content-secondary focus:outline-none"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
        ))}
      </select>
      {confirmDelete ? (
        <div className="flex gap-1">
          <button
            onClick={() => onRemove(item.id)}
            className="text-xs px-2 py-1 rounded-lg bg-accent-coral/20 text-accent-coral hover:bg-accent-coral/30"
          >Remove</button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-2 py-1 rounded-lg bg-surface-primary text-content-muted hover:bg-surface-primary/70"
          >Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="text-content-muted hover:text-accent-coral transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function LibraryMoviesPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState<MovieStatus | "">("");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    getLibraryMovies({ status: activeTab || undefined })
      .then((r) => setItems(r.results))
      .catch((e) => setError(e.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, activeTab]);

  const handleRemove = async (id: string) => {
    await removeLibraryItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleStatusChange = async (id: string, newStatus: MovieStatus) => {
    const updated = await updateLibraryItem(id, { status: newStatus });
    setItems((prev) => prev.map((i) => i.id === id ? updated : i));
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/library" className="text-content-muted hover:text-content-secondary text-sm">← Library</Link>
          <h1 className="text-2xl font-bold text-content-primary">Movies</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-primary/60 rounded-2xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-white text-content-primary shadow-sm"
                  : "text-content-muted hover:text-content-secondary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-primary/60 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🎬</div>
            <p className="text-content-muted">No movies {activeTab ? `with status "${activeTab.replace(/_/g, " ")}"` : "in your library"} yet.</p>
            <Link href="/movies" className="mt-4 inline-block text-sm text-accent-blue hover:text-accent-blue">Browse movies →</Link>
          </div>
        ) : (
          <div className="bg-surface-primary/50 border border-border-subtle rounded-2xl px-4">
            {items.map((item) => (
              <MovieItemRow key={item.id} item={item} onRemove={handleRemove} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

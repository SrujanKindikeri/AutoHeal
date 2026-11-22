"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Film, Tv, Trash2 } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { TMDBAttribution } from "@/components/entertainment/TMDBAttribution";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuthStore } from "@/store/authStore";
import type { WatchlistItem } from "@/types/entertainment";

type FilterTab = "all" | "movie" | "tv";

const TABS: TabItem[] = [
  { id: "all", label: "All" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Shows" },
];

function WatchlistItemCard({
  item,
  onRemove,
  removing,
}: {
  item: WatchlistItem;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const detailPath = item.media_type === "movie" ? `/movies/${item.tmdb_id}` : `/shows/${item.tmdb_id}`;
  const addedDate = new Date(item.added_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card variant="default" padding="none" className="flex gap-4 overflow-hidden">
      {/* Poster */}
      <Link
        href={detailPath}
        className="shrink-0 w-20 sm:w-28 relative"
        aria-label={`View ${item.title}`}
        tabIndex={-1}
      >
        <div className="relative w-full aspect-[2/3] bg-surface-primary">
          {item.poster_url && !imageError ? (
            <Image
              src={item.poster_url}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 80px, 112px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-semibold text-content-muted select-none">
                {item.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between py-4 pr-4 min-w-0">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <Link href={detailPath} className="min-w-0">
              <h3 className="text-body-md font-semibold text-content-primary hover:text-accent-blue transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h3>
            </Link>
            <Badge
              variant={item.media_type === "movie" ? "accent" : "purple"}
              size="sm"
              className="shrink-0"
            >
              {item.media_type === "movie" ? (
                <><Film className="w-3 h-3 mr-1" />Movie</>
              ) : (
                <><Tv className="w-3 h-3 mr-1" />TV</>
              )}
            </Badge>
          </div>
          <p className="text-caption text-content-muted">Added {addedDate}</p>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Link href={detailPath}>
            <Button variant="secondary" size="sm">
              View Details
            </Button>
          </Link>
          <button
            onClick={() => onRemove(item.id)}
            disabled={removing}
            aria-label={`Remove ${item.title} from watchlist`}
            className="p-2 rounded-xl text-content-muted hover:text-accent-coral hover:bg-accent-coral/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function WatchlistPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { items, loading, error, remove } = useWatchlist();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const filtered = activeTab === "all" ? items : items.filter((i) => i.media_type === activeTab);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await remove(id);
    } finally {
      setRemovingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <PageHeader
            title="Watchlist"
            icon={<Bookmark className="w-5 h-5 text-accent-blue" />}
          />
          <div
            className="rounded-3xl p-12 text-center space-y-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Bookmark className="w-12 h-12 text-content-muted mx-auto" />
            <h2 className="text-heading-sm font-bold text-content-primary">Sign in to see your watchlist</h2>
            <p className="text-body-md text-content-secondary max-w-sm mx-auto">
              Save movies and TV shows to watch later. Your list syncs across all your devices.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/login">
                <Button variant="primary">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary">Create Account</Button>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <PageHeader
          title="Watchlist"
          icon={<Bookmark className="w-5 h-5 text-accent-blue" />}
          description={
            items.length > 0
              ? `${items.length} title${items.length !== 1 ? "s" : ""} saved`
              : undefined
          }
        />

        {/* Filter tabs */}
        {items.length > 0 && (
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as FilterTab)}
          />
        )}

        {/* Content */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="default" padding="none" className="flex gap-4 h-32 animate-pulse">
                <div className="w-20 sm:w-28 bg-surface-primary shrink-0 rounded-l-3xl" />
                <div className="flex-1 py-4 pr-4 space-y-2">
                  <div className="h-4 bg-surface-primary rounded-xl w-3/4" />
                  <div className="h-3 bg-surface-primary rounded-xl w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div
            className="rounded-3xl p-8 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-body-md text-content-secondary">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-3xl p-12 text-center space-y-3"
            style={{ background: "var(--card)", border: "1px solid var(--border-subtle)" }}
          >
            <Bookmark className="w-10 h-10 text-content-muted mx-auto" />
            <h3 className="text-heading-sm font-semibold text-content-primary">
              {activeTab === "all" ? "Your watchlist is empty" : `No ${activeTab === "movie" ? "movies" : "TV shows"} saved`}
            </h3>
            <p className="text-body-sm text-content-secondary">
              {activeTab === "all"
                ? "Browse movies and TV shows and add them here."
                : `Switch to "All" or browse ${activeTab === "movie" ? "movies" : "TV shows"}.`}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/movies"><Button variant="secondary" size="sm">Browse Movies</Button></Link>
              <Link href="/shows"><Button variant="secondary" size="sm">Browse TV Shows</Button></Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <WatchlistItemCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                removing={removingId === item.id}
              />
            ))}
          </div>
        )}

        {items.length > 0 && <TMDBAttribution className="pb-4" />}
      </div>
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "@/components/ui/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { searchMusic } from "@/lib/musicApi";
import type {
  MBArtist,
  MBAlbum,
  MBTrack,
  MusicSearchResults,
  MusicPaginatedResponse,
} from "@/types/music";
import { Music } from "lucide-react";

type SearchTab = "all" | "track" | "artist" | "album";

const TABS: { id: SearchTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "track", label: "Tracks" },
  { id: "artist", label: "Artists" },
  { id: "album", label: "Albums" },
];

function formatDuration(ms: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  const [results, setResults] = useState<MusicSearchResults | null>(null);
  const [singleResults, setSingleResults] = useState<(MBTrack | MBArtist | MBAlbum)[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const doSearch = useCallback(
    (q: string, tab: SearchTab, pg: number, append = false) => {
      if (q.length < 2) return;
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      searchMusic(q, tab, pg)
        .then((res) => {
          if (tab === "all") {
            setResults(res as MusicSearchResults);
            setSingleResults([]);
          } else {
            const paged = res as MusicPaginatedResponse<MBTrack | MBArtist | MBAlbum>;
            if (append) {
              setSingleResults((prev) => [...prev, ...paged.results]);
            } else {
              setSingleResults(paged.results);
            }
            setTotalResults(paged.total_results);
            setResults(null);
          }
          setPage(pg);
        })
        .catch(() => setError("Search failed. Please try again."))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    []
  );

  // Debounced search on query change
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setSingleResults([]);
      setError(null);
      return;
    }
    const timer = setTimeout(() => doSearch(query, activeTab, 1), 300);
    return () => clearTimeout(timer);
  }, [query, activeTab, doSearch]);

  const handleLoadMore = () => {
    doSearch(query, activeTab, page + 1, true);
  };

  const hasMore = singleResults.length < totalResults && activeTab !== "all";

  const renderSkeletons = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton variant="rectangular" className="w-full aspect-square" />
          <Skeleton variant="text" width="72%" />
          <Skeleton variant="text" width="40%" />
        </div>
      ))}
    </div>
  );

  const renderTrack = (track: MBTrack) => (
    <MediaCard
      key={track.mbid}
      id={track.mbid}
      title={track.title}
      subtitle={track.artists.map((a) => a.name).join(", ")}
      artworkUrl={track.artwork_url ?? ""}
      type="music"
      aspectRatio="square"
      duration={track.duration_ms ? formatDuration(track.duration_ms) : undefined}
      onClick={() => router.push(`/music/track/${track.mbid}`)}
    />
  );

  const renderArtist = (artist: MBArtist) => (
    <MediaCard
      key={artist.mbid}
      id={artist.mbid}
      title={artist.name}
      subtitle={artist.disambiguation ?? "Artist"}
      artworkUrl={artist.image_url ?? ""}
      type="music"
      aspectRatio="square"
      onClick={() => router.push(`/music/artist/${artist.mbid}`)}
    />
  );

  const renderAlbum = (album: MBAlbum) => (
    <MediaCard
      key={album.mbid}
      id={album.mbid}
      title={album.title}
      subtitle={album.artists.map((a) => a.name).join(", ")}
      artworkUrl={album.cover_art_url ?? ""}
      type="music"
      aspectRatio="square"
      year={album.release_date?.slice(0, 4) ?? undefined}
      onClick={() => router.push(`/music/album/${album.mbid}`)}
    />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      <h1 className="text-heading-lg font-bold text-content-primary">Music Search</h1>

      {/* Search input */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks, artists, albums…"
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-surface-elevated border border-border-glass text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 transition-all"
        />
      </div>

      {/* Tabs */}
      {query.length >= 2 && (
        <div className="flex gap-1 p-1 bg-surface-elevated rounded-2xl w-fit border border-border-glass">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-body-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-accent-blue text-white shadow-sm"
                  : "text-content-secondary hover:text-content-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {query.length < 2 ? (
        <p className="text-body-sm text-content-muted">Type at least 2 characters to search.</p>
      ) : loading ? (
        renderSkeletons()
      ) : error ? (
        <EmptyState
          icon={<Music className="w-8 h-8" />}
          title="Search failed"
          description={error}
        />
      ) : activeTab === "all" && results ? (
        <div className="space-y-8">
          {results.artists.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-heading-sm font-semibold text-content-primary">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.artists.map(renderArtist)}
              </div>
            </section>
          )}
          {results.albums.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-heading-sm font-semibold text-content-primary">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.albums.map(renderAlbum)}
              </div>
            </section>
          )}
          {results.tracks.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-heading-sm font-semibold text-content-primary">Tracks</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.tracks.map(renderTrack)}
              </div>
            </section>
          )}
          {results.artists.length === 0 && results.albums.length === 0 && results.tracks.length === 0 && (
            <EmptyState
              icon={<Music className="w-8 h-8" />}
              title={`No results for "${query}"`}
              description="Try a different search term."
            />
          )}
        </div>
      ) : (
        <>
          {singleResults.length === 0 ? (
            <EmptyState
              icon={<Music className="w-8 h-8" />}
              title={`No results for "${query}"`}
              description="Try a different search term."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {activeTab === "track" && (singleResults as MBTrack[]).map(renderTrack)}
                {activeTab === "artist" && (singleResults as MBArtist[]).map(renderArtist)}
                {activeTab === "album" && (singleResults as MBAlbum[]).map(renderAlbum)}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-2xl text-body-md font-semibold border border-border-glass bg-surface-elevated text-content-secondary hover:bg-surface-glass hover:text-content-primary transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <p className="text-caption text-content-muted pb-4 text-center">
        Music metadata provided by{" "}
        <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
          MusicBrainz
        </a>{" "}
        (CC0).
      </p>
    </div>
  );
}

export default function MusicSearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><Skeleton variant="rectangular" height={400} /></div>}>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}

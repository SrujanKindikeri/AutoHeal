"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { SearchBar } from "@/components/entertainment/SearchBar";
import { MediaCard } from "@/components/entertainment/MediaCard";
import { SkeletonCard } from "@/components/entertainment/SkeletonCard";
import { searchContent } from "@/lib/entertainmentApi";
import type { TMDBMovie, TMDBTVShow, MediaType } from "@/types/entertainment";

type SearchResult = (TMDBMovie & { media_type: "movie" }) | (TMDBTVShow & { media_type: "tv" });

const TYPE_OPTIONS: { label: string; value: MediaType }[] = [
  { label: "All", value: "all" },
  { label: "Movies", value: "movie" },
  { label: "TV Shows", value: "tv" },
];

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialType = (searchParams.get("type") as MediaType) ?? "all";

  const [query, setQuery] = useState(initialQ);
  const [type, setType] = useState<MediaType>(initialType);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(
    async (q: string, t: MediaType, pg: number, append: boolean) => {
      if (!q.trim()) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await searchContent(q, t, pg);
        const newResults: SearchResult[] = (data.results ?? []).map((r: any) => ({
          ...r,
          media_type: r.media_type ?? (t !== "all" ? t : "movie"),
        }));
        setResults((prev) => (append ? [...prev, ...newResults] : newResults));
        setTotalPages(data.total_pages ?? 1);
        setPage(pg);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setError(err?.message ?? "Search failed. Please try again.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Sync URL params → state and trigger search
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const t = (searchParams.get("type") as MediaType) ?? "all";
    setQuery(q);
    setType(t);
    if (q.trim()) {
      doSearch(q, t, 1, false);
    } else {
      setResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Dynamic page title
  useEffect(() => {
    document.title = query
      ? `"${query}" — Search | MovieFlow`
      : "Search | MovieFlow";
  }, [query]);

  const pushParams = (q: string, t: MediaType) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t !== "all") params.set("type", t);
    router.push(`/search?${params.toString()}`);
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    pushParams(q, type);
  };

  const handleTypeChange = (t: MediaType) => {
    setType(t);
    pushParams(query, t);
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      doSearch(query, type, page + 1, true);
    }
  };

  const handleRetry = () => {
    setError(null);
    doSearch(query, type, 1, false);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <h1 className="text-heading-lg font-bold text-content-primary">Search</h1>

        {/* Search input */}
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          isLoading={loading}
        />

        {/* Type filter */}
        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by type">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeChange(opt.value)}
              aria-pressed={type === opt.value}
              className={`px-4 py-1.5 rounded-2xl text-body-sm font-medium border transition-all duration-200 select-none active:scale-95 ${
                type === opt.value
                  ? "bg-accent-blue text-white border-accent-blue shadow-glow-blue"
                  : "bg-surface-elevated text-content-secondary border-border-glass hover:bg-surface-glass hover:text-content-primary hover:border-border-strong"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-body-md text-content-secondary">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-sm font-semibold border border-border-glass bg-surface-elevated text-content-secondary hover:bg-surface-glass hover:text-content-primary transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Results grid */}
        {!loading && !error && results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {results.map((item, i) => {
                const isMovie = item.media_type === "movie";
                return (
                  <div key={`${item.id}-${i}`} className="relative">
                    {/* Media type badge */}
                    <span className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 text-caption font-semibold text-white capitalize">
                      {isMovie ? "Movie" : "TV"}
                    </span>
                    <MediaCard
                      item={item}
                      mediaType={item.media_type}
                    />
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {page < totalPages && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-2xl text-body-md font-semibold border border-border-glass bg-surface-elevated text-content-secondary hover:bg-surface-glass hover:text-content-primary transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !error && query.trim() && results.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-heading-sm text-content-secondary">
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

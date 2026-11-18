"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/navigation/AppShell";
import { MediaCard } from "@/components/entertainment/MediaCard";
import { SkeletonCard } from "@/components/entertainment/SkeletonCard";
import { TMDBAttribution } from "@/components/entertainment/TMDBAttribution";
import { getUpcomingMovies } from "@/lib/entertainmentApi";
import type { TMDBMovie } from "@/types/entertainment";

export default function UpcomingMoviesPage() {
  const [movies, setMovies] = useState<TMDBMovie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUpcomingMovies(1)
      .then((res) => {
        setMovies(res.results);
        setTotalPages(res.total_pages);
        setPage(1);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = () => {
    if (page >= totalPages) return;
    setLoadingMore(true);
    getUpcomingMovies(page + 1)
      .then((res) => {
        setMovies((prev) => [...prev, ...res.results]);
        setPage(res.page);
        setTotalPages(res.total_pages);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoadingMore(false));
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <h1 className="text-heading-lg font-bold text-content-primary">Upcoming Movies</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 20 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {movies.map((m) => (
                <MediaCard key={m.id} item={m} mediaType="movie" />
              ))}
            </div>

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

        <TMDBAttribution className="pb-4" />
      </div>
    </AppShell>
  );
}

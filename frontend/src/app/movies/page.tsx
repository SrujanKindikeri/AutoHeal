"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/navigation/AppShell";
import {
  MediaHero,
  MediaRow,
  GenreChips,
  TMDBAttribution,
} from "@/components/entertainment";
import { SkeletonCard } from "@/components/entertainment/SkeletonCard";
import {
  getTrendingMovies,
  getPopularMovies,
  getTopRatedMovies,
  getUpcomingMovies,
  getGenres,
  discoverMedia,
} from "@/lib/entertainmentApi";
import type { TMDBMovie, Genre, TMDBPaginatedResponse } from "@/types/entertainment";

export default function MoviesPage() {
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [popular, setPopular] = useState<TMDBMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovie[]>([]);
  const [upcoming, setUpcoming] = useState<TMDBMovie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [discoverResults, setDiscoverResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Initial data load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTrendingMovies(),
      getPopularMovies(),
      getTopRatedMovies(),
      getUpcomingMovies(),
      getGenres("movie"),
    ])
      .then(([t, p, tr, u, g]) => {
        setTrending(t.results);
        setPopular(p.results);
        setTopRated(tr.results);
        setUpcoming(u.results);
        setGenres(g);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoading(false));
  }, []);

  // Reload when genre changes
  useEffect(() => {
    if (selectedGenre === null) {
      setDiscoverResults([]);
      return;
    }
    setDiscoverLoading(true);
    discoverMedia("movie", { genre: selectedGenre })
      .then((res: TMDBPaginatedResponse<TMDBMovie>) => setDiscoverResults(res.results))
      .catch(() => setDiscoverResults([]))
      .finally(() => setDiscoverLoading(false));
  }, [selectedGenre]);

  const hero = trending[0] ?? null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Hero */}
        {loading ? (
          <div className="w-full rounded-3xl bg-surface-elevated animate-pulse" style={{ minHeight: "420px" }} />
        ) : hero ? (
          <MediaHero item={hero} mediaType="movie" />
        ) : null}

        {/* Genre filter */}
        {genres.length > 0 && (
          <section aria-label="Browse by genre">
            <GenreChips
              genres={genres}
              selected={selectedGenre}
              onSelect={setSelectedGenre}
            />
          </section>
        )}

        {/* Genre discover results */}
        {selectedGenre !== null && (
          <MediaRow
            title={genres.find((g) => g.id === selectedGenre)?.name ?? "Genre"}
            items={discoverLoading ? [] : discoverResults}
            mediaType="movie"
            loading={discoverLoading}
          />
        )}

        {/* Category rows */}
        <MediaRow
          title="Trending"
          items={loading ? [] : trending}
          mediaType="movie"
          loading={loading}
          viewAllHref="/movies/trending"
        />
        <MediaRow
          title="Popular"
          items={loading ? [] : popular}
          mediaType="movie"
          loading={loading}
          viewAllHref="/movies/popular"
        />
        <MediaRow
          title="Top Rated"
          items={loading ? [] : topRated}
          mediaType="movie"
          loading={loading}
          viewAllHref="/movies/top-rated"
        />
        <MediaRow
          title="Upcoming"
          items={loading ? [] : upcoming}
          mediaType="movie"
          loading={loading}
          viewAllHref="/movies/upcoming"
        />

        <TMDBAttribution className="pb-4" />
      </div>
    </AppShell>
  );
}

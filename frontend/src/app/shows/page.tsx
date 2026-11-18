"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/navigation/AppShell";
import {
  MediaHero,
  MediaRow,
  GenreChips,
  TMDBAttribution,
} from "@/components/entertainment";
import {
  getTrendingTV,
  getPopularTV,
  getTopRatedTV,
  getOnTheAirTV,
  getGenres,
  discoverMedia,
} from "@/lib/entertainmentApi";
import type { TMDBTVShow, Genre, TMDBPaginatedResponse } from "@/types/entertainment";

export default function ShowsPage() {
  const [trending, setTrending] = useState<TMDBTVShow[]>([]);
  const [popular, setPopular] = useState<TMDBTVShow[]>([]);
  const [topRated, setTopRated] = useState<TMDBTVShow[]>([]);
  const [onTheAir, setOnTheAir] = useState<TMDBTVShow[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [discoverResults, setDiscoverResults] = useState<TMDBTVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Initial data load
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTrendingTV(),
      getPopularTV(),
      getTopRatedTV(),
      getOnTheAirTV(),
      getGenres("tv"),
    ])
      .then(([t, p, tr, o, g]) => {
        setTrending(t.results);
        setPopular(p.results);
        setTopRated(tr.results);
        setOnTheAir(o.results);
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
    discoverMedia("tv", { genre: selectedGenre })
      .then((res: TMDBPaginatedResponse<TMDBTVShow>) => setDiscoverResults(res.results))
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
          <MediaHero item={hero} mediaType="tv" />
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
            mediaType="tv"
            loading={discoverLoading}
          />
        )}

        {/* Category rows */}
        <MediaRow
          title="Trending"
          items={loading ? [] : trending}
          mediaType="tv"
          loading={loading}
        />
        <MediaRow
          title="Popular"
          items={loading ? [] : popular}
          mediaType="tv"
          loading={loading}
        />
        <MediaRow
          title="Top Rated"
          items={loading ? [] : topRated}
          mediaType="tv"
          loading={loading}
        />
        <MediaRow
          title="On The Air"
          items={loading ? [] : onTheAir}
          mediaType="tv"
          loading={loading}
        />

        <TMDBAttribution className="pb-4" />
      </div>
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Calendar,
  Clock,
  Globe,
  Star,
  Users,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { WatchlistButton } from "@/components/entertainment/WatchlistButton";
import { MediaRow } from "@/components/entertainment/MediaRow";
import { TMDBAttribution } from "@/components/entertainment/TMDBAttribution";
import { getMovieDetail } from "@/lib/entertainmentApi";

interface MovieDetail {
  id: number;
  title: string;
  overview: string;
  release_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  original_language: string;
  backdrop_url: string | null;
  poster_url: string | null;
  poster_path: string | null;
  genres: Array<{ id: number; name: string }>;
  recommendations?: { results: any[] };
}

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const tmdbId = Number(params.id);

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tmdbId) return;
    setLoading(true);
    setError(null);
    getMovieDetail(tmdbId)
      .then((data) => {
        setMovie(data);
        document.title = `${data.title} | MovieFlow`;
      })
      .catch((err: Error) => setError(err.message ?? "Failed to load movie"))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: movie?.title ?? "Movie", url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copied!");
      setTimeout(() => setShareMsg(null), 2500);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 animate-pulse">
          <div className="w-full rounded-3xl bg-surface-elevated" style={{ height: "360px" }} />
          <div className="flex gap-6">
            <div className="w-40 h-60 rounded-2xl bg-surface-elevated shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-2/3 rounded-xl bg-surface-elevated" />
              <div className="h-4 w-full rounded-xl bg-surface-elevated" />
              <div className="h-4 w-5/6 rounded-xl bg-surface-elevated" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !movie) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
          <p className="text-heading-sm text-content-secondary">
            {error ?? "Movie not found"}
          </p>
        </div>
      </AppShell>
    );
  }

  const showBackdrop = !!movie.backdrop_url && !backdropError;
  const showPoster = !!movie.poster_url && !posterError;
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const runtime =
    movie.runtime
      ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
      : null;
  const recommendations = movie.recommendations?.results ?? [];

  return (
    <AppShell>
      {/* Backdrop */}
      <div className="relative w-full overflow-hidden" style={{ height: "360px" }}>
        {showBackdrop ? (
          <Image
            src={movie.backdrop_url!}
            alt={`${movie.title} backdrop`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-elevated via-surface-secondary to-surface-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/50 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-24 relative z-10 pb-10 space-y-8">
        {/* Poster + details */}
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Poster */}
          <div className="shrink-0 w-40 sm:w-52">
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-border-glass shadow-glass-elevated bg-surface-elevated">
              {showPoster ? (
                <Image
                  src={movie.poster_url!}
                  alt={movie.title}
                  fill
                  sizes="(max-width: 640px) 160px, 208px"
                  className="object-cover"
                  onError={() => setPosterError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-semibold text-content-muted select-none">
                    {movie.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4 pt-2">
            <h1 className="text-heading-xl sm:text-display-sm font-bold text-content-primary leading-tight">
              {movie.title}
            </h1>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-content-secondary">
              {movie.vote_average > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-elevated border border-border-glass">
                  <Star className="w-3.5 h-3.5 text-accent-gold fill-accent-gold" />
                  <span className="font-semibold text-content-primary">
                    {movie.vote_average.toFixed(1)}
                  </span>
                  {movie.vote_count > 0 && (
                    <span className="text-content-muted">
                      ({movie.vote_count.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {releaseYear && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {movie.release_date}
                </span>
              )}
              {runtime && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {runtime}
                </span>
              )}
              {movie.original_language && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {movie.original_language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-2xl text-body-sm font-medium bg-surface-elevated border border-border-glass text-content-secondary"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-body-md text-content-secondary leading-relaxed max-w-2xl">
                {movie.overview}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <WatchlistButton
                tmdbId={movie.id}
                mediaType="movie"
                title={movie.title}
                posterPath={movie.poster_path ?? undefined}
              />

              {/* Watch Together — coming soon (no room route yet) */}
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-md font-semibold border border-border-glass bg-surface-elevated text-content-muted cursor-not-allowed select-none">
                <Users className="w-4 h-4 shrink-0" />
                Watch Together
                <span className="ml-1 px-2 py-0.5 rounded-lg bg-surface-primary text-caption text-content-muted border border-border-glass">
                  Coming Soon
                </span>
              </span>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  aria-label="Share this movie"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-md font-semibold border border-border-glass bg-surface-elevated text-content-secondary hover:bg-surface-glass hover:text-content-primary transition-all duration-200 active:scale-[0.97]"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  Share
                </button>
                {shareMsg && (
                  <span className="absolute top-full mt-1.5 left-0 text-caption text-accent-blue whitespace-nowrap">
                    {shareMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <MediaRow
            title="Recommendations"
            items={recommendations}
            mediaType="movie"
          />
        )}

        <TMDBAttribution className="pb-4" />
      </div>
    </AppShell>
  );
}

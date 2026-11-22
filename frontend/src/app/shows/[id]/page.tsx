"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Calendar,
  Globe,
  Star,
  Users,
  Share2,
} from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { WatchlistButton } from "@/components/entertainment/WatchlistButton";
import { MediaRow } from "@/components/entertainment/MediaRow";
import { TMDBAttribution } from "@/components/entertainment/TMDBAttribution";
import { getTVDetail } from "@/lib/entertainmentApi";

interface TVShowDetail {
  id: number;
  name: string;
  overview: string;
  first_air_date: string | null;
  last_air_date: string | null;
  vote_average: number;
  vote_count: number;
  original_language: string;
  backdrop_url: string | null;
  poster_url: string | null;
  poster_path: string | null;
  genres: Array<{ id: number; name: string }>;
  recommendations?: { results: any[] };
}

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const tmdbId = Number(params.id);

  const [show, setShow] = useState<TVShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!tmdbId) return;
    setLoading(true);
    setError(null);
    getTVDetail(tmdbId)
      .then((data) => {
        setShow(data);
        document.title = `${data.name} | MovieFlow`;
      })
      .catch((err: Error) => setError(err.message ?? "Failed to load show"))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: show?.name ?? "TV Show", url });
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

  if (error || !show) {
    return (
      <AppShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
          <p className="text-heading-sm text-content-secondary">
            {error ?? "Show not found"}
          </p>
        </div>
      </AppShell>
    );
  }

  const showBackdrop = !!show.backdrop_url && !backdropError;
  const showPoster = !!show.poster_url && !posterError;
  const recommendations = show.recommendations?.results ?? [];

  return (
    <AppShell>
      {/* Backdrop — full-width image with a subtle bottom fade to white */}
      <div className="relative w-full overflow-hidden rounded-b-3xl" style={{ height: "340px" }}>
        {showBackdrop ? (
          <Image
            src={show.backdrop_url!}
            alt={`${show.name} backdrop`}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
            onError={() => setBackdropError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-primary via-surface-secondary to-surface-elevated" />
        )}
        {/* Fade to white page background at the bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-20 relative z-10 pb-10 space-y-8">
        {/* Poster + details card */}
        <div
          className="rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          {/* Poster */}
          <div className="shrink-0 w-40 sm:w-52">
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-border-subtle shadow-glass bg-surface-primary">
              {showPoster ? (
                <Image
                  src={show.poster_url!}
                  alt={show.name}
                  fill
                  sizes="(max-width: 640px) 160px, 208px"
                  className="object-cover"
                  onError={() => setPosterError(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-semibold text-content-muted select-none">
                    {show.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4">
            <h1 className="text-heading-xl sm:text-display-sm font-bold text-content-primary leading-tight">
              {show.name}
            </h1>

            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-3 text-body-sm text-content-secondary">
              {show.vote_average > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-primary border border-border-subtle">
                  <Star className="w-3.5 h-3.5 text-accent-gold fill-accent-gold" />
                  <span className="font-semibold text-content-primary">
                    {show.vote_average.toFixed(1)}
                  </span>
                  {show.vote_count > 0 && (
                    <span className="text-content-muted">
                      ({show.vote_count.toLocaleString()})
                    </span>
                  )}
                </span>
              )}
              {show.first_air_date && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {show.first_air_date}
                  {show.last_air_date && show.last_air_date !== show.first_air_date && (
                    <> — {show.last_air_date}</>
                  )}
                </span>
              )}
              {show.original_language && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {show.original_language.toUpperCase()}
                </span>
              )}
            </div>

            {/* Genres */}
            {show.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-2xl text-body-sm font-medium bg-surface-primary border border-border-subtle text-content-secondary"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {show.overview && (
              <p className="text-body-md text-content-secondary leading-relaxed max-w-2xl">
                {show.overview}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <WatchlistButton
                tmdbId={show.id}
                mediaType="tv"
                title={show.name}
                posterPath={show.poster_path ?? undefined}
              />

              {/* Watch Together — coming soon */}
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-md font-semibold border border-border-subtle bg-surface-primary text-content-muted cursor-not-allowed select-none">
                <Users className="w-4 h-4 shrink-0" />
                Watch Together
                <span className="ml-1 px-2 py-0.5 rounded-lg bg-surface-secondary text-caption text-content-muted border border-border-subtle">
                  Coming Soon
                </span>
              </span>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  aria-label="Share this show"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-body-md font-semibold border border-border-subtle bg-surface-primary text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-all duration-200 active:scale-[0.97]"
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
            mediaType="tv"
          />
        )}

        <TMDBAttribution className="pb-4" />
      </div>
    </AppShell>
  );
}

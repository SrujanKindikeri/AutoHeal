"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getMovieDetail } from "@/lib/entertainmentApi";

interface MovieMeta {
  id: number;
  title: string;
  runtime: number | null;
  overview: string;
  backdrop_url: string | null;
}

/**
 * Movie player page — /movies/[id]/watch.
 * Renders an accessible placeholder panel for the video player.
 * The actual streaming integration (HLS source, DRM, etc.) is wired in
 * once the media-delivery API is available; this page preserves the route
 * and fetches movie metadata via the existing getMovieDetail call so the
 * surrounding UI (title, back-link) works correctly today.
 */
export default function MoviePlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tmdbId = Number(params.id);

  const [movie, setMovie] = useState<MovieMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tmdbId) return;
    setLoading(true);
    getMovieDetail(tmdbId)
      .then((data: MovieMeta) => {
        setMovie(data);
        document.title = `Watch ${data.title} | MovieFlow`;
      })
      .catch((err: Error) => setError(err.message ?? "Failed to load movie"))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-body-sm font-medium text-content-secondary hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <PageHeader
          title={loading ? "Loading…" : (movie?.title ?? "Movie Player")}
          icon={<Play className="w-5 h-5 text-accent-blue" />}
        />

        {error ? (
          <Card variant="default" padding="lg">
            <div className="flex items-center gap-3 text-accent-coral">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-body-md">{error}</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Player area */}
            <div
              className="relative w-full overflow-hidden rounded-3xl flex items-center justify-center"
              style={{
                aspectRatio: "16/9",
                background: "var(--surface-primary)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 24px 48px rgba(0,0,0,0.08)",
              }}
              role="region"
              aria-label="Video player"
            >
              {/* Placeholder — replace with <video> or HLS player once streaming API is ready */}
              <div className="text-center space-y-4 px-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{
                    background: "var(--accent)",
                    boxShadow: "0 0 30px -5px rgba(37, 99, 235, 0.4)",
                  }}
                >
                  <Play className="w-9 h-9 text-white fill-white ml-1" />
                </div>
                <div>
                  <p className="text-heading-sm font-semibold text-content-primary">
                    Streaming coming soon
                  </p>
                  <p className="text-body-sm text-content-muted mt-1">
                    Video playback will be available once the streaming service is connected.
                  </p>
                </div>
              </div>
            </div>

            {/* Movie info below player */}
            {movie && (
              <Card variant="default" padding="lg">
                <div className="space-y-3">
                  <h2 className="text-heading-sm font-bold text-content-primary">{movie.title}</h2>
                  {movie.runtime && (
                    <p className="text-body-sm text-content-muted">
                      {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                    </p>
                  )}
                  {movie.overview && (
                    <p className="text-body-md text-content-secondary leading-relaxed line-clamp-3">
                      {movie.overview}
                    </p>
                  )}
                  <div className="pt-2">
                    <Link href={`/movies/${tmdbId}`}>
                      <Button variant="secondary" size="sm">View Movie Details</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Disc, ArrowLeft, Clock } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMusicAlbum } from "@/lib/musicApi";
import type { MBAlbumDetail } from "@/types/music";

function formatDuration(ms: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function totalDuration(tracks: MBAlbumDetail["tracks"]): string {
  const total = tracks.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
  return formatDuration(total);
}

const ALBUM_TYPE_LABELS: Record<string, string> = {
  album: "Album",
  single: "Single",
  ep: "EP",
  compilation: "Compilation",
  other: "Release",
};

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [album, setAlbum] = useState<MBAlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMusicAlbum(id as string)
      .then((data) => setAlbum(data))
      .catch((err) => {
        if (err?.status === 404 || err?.message?.includes("404")) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-8">
            <Skeleton variant="rectangular" className="w-64 h-64 shrink-0" />
            <div className="space-y-4 flex-1">
              <Skeleton variant="text" width="60%" height={36} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="30%" height={20} />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={48} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !album) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <EmptyState
            icon={<Disc className="w-8 h-8" />}
            title="Album not found"
            description="This album doesn't exist or could not be loaded."
            action={{ label: "Browse Music", onClick: () => router.push("/music") }}
          />
        </div>
      </AppShell>
    );
  }

  const tracks = album.tracks ?? [];
  const totalMs = tracks.reduce((s, t) => s + (t.duration_ms || 0), 0);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-body-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-col sm:flex-row gap-8">
          {/* Cover art */}
          <div className="shrink-0 w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden bg-surface-elevated border border-border-glass shadow-xl">
            {album.cover_art_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={album.cover_art_url} alt={album.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-blue/20 to-accent-purple/20">
                <Disc className="w-16 h-16 text-accent-blue/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-caption font-semibold bg-surface-elevated border border-border-glass rounded-lg text-content-muted">
                {ALBUM_TYPE_LABELS[album.album_type] ?? "Release"}
              </span>
            </div>
            <h1 className="text-heading-lg font-bold text-content-primary">{album.title}</h1>

            {/* Artists */}
            <div className="flex flex-wrap gap-1 text-body-md text-content-secondary">
              {album.artists.map((artist, i) => (
                <React.Fragment key={artist.mbid}>
                  <Link
                    href={`/music/artist/${artist.mbid}`}
                    className="hover:text-accent-blue transition-colors"
                  >
                    {artist.name}
                  </Link>
                  {i < album.artists.length - 1 && <span>,</span>}
                </React.Fragment>
              ))}
            </div>

            {album.release_date && (
              <p className="text-body-sm text-content-muted">
                Released: {album.release_date.slice(0, 10)}
              </p>
            )}

            {totalMs > 0 && (
              <p className="text-body-sm text-content-muted flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDuration(totalMs)} total · {tracks.length} tracks
              </p>
            )}

            {album.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {album.genres.slice(0, 5).map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full text-caption bg-surface-elevated border border-border-glass text-content-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Track listing */}
        {tracks.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-heading-sm font-semibold text-content-primary">Tracks</h2>
            <div className="rounded-2xl border border-border-glass overflow-hidden divide-y divide-border-subtle">
              {tracks.map((track, idx) => {
                const trackArtists = (track as any)["artist-credit"] ?? [];
                const artistNames = trackArtists
                  .filter((c: any) => c?.artist)
                  .map((c: any) => c.artist.name ?? "")
                  .join(", ");
                return (
                  <div
                    key={track.mbid || idx}
                    className="flex items-center gap-4 px-4 py-3 bg-surface-primary hover:bg-surface-elevated transition-colors"
                  >
                    <span className="text-caption text-content-muted w-6 text-right shrink-0">
                      {(track as any).track_number || idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/music/track/${track.mbid}`}
                        className="text-body-sm font-medium text-content-primary hover:text-accent-blue transition-colors truncate block"
                      >
                        {track.title}
                      </Link>
                      {artistNames && (
                        <p className="text-caption text-content-muted truncate">{artistNames}</p>
                      )}
                    </div>
                    {track.duration_ms > 0 && (
                      <span className="text-caption text-content-muted shrink-0">
                        {formatDuration(track.duration_ms)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="text-caption text-content-muted pb-4">
          Music metadata provided by{" "}
          <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
            MusicBrainz
          </a>{" "}
          (CC0). Cover art from{" "}
          <a href="https://coverartarchive.org" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
            Cover Art Archive
          </a>.
        </p>
      </div>
    </AppShell>
  );
}

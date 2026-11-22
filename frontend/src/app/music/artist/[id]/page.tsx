"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Mic2, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "@/components/ui/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getMusicArtist,
  getMusicArtistTopTracks,
  getMusicArtistAlbums,
} from "@/lib/musicApi";
import type { MBArtist, MBTrack, MBAlbum } from "@/types/music";

function formatDuration(ms: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ArtistAvatar({ artist }: { artist: MBArtist }) {
  if (artist.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={artist.image_url}
        alt={artist.name}
        className="w-32 h-32 sm:w-48 sm:h-48 rounded-full object-cover border-4 border-border-glass shadow-xl"
      />
    );
  }
  const initials = artist.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full flex items-center justify-center bg-gradient-to-br from-accent-blue/30 to-accent-purple/30 border-4 border-border-glass shadow-xl text-heading-lg font-bold text-content-primary">
      {initials || <Mic2 className="w-12 h-12 text-accent-blue/60" />}
    </div>
  );
}

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [artist, setArtist] = useState<MBArtist | null>(null);
  const [tracks, setTracks] = useState<MBTrack[]>([]);
  const [albums, setAlbums] = useState<MBAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMusicArtist(id as string)
      .then((data) => {
        setArtist(data);
        return Promise.all([
          getMusicArtistTopTracks(id as string),
          getMusicArtistAlbums(id as string),
        ]);
      })
      .then(([t, a]) => {
        setTracks(t.results);
        setAlbums(a.results);
      })
      .catch((err) => {
        if (err?.status === 404 || err?.message?.includes("404")) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
            <Skeleton variant="circular" className="w-48 h-48 shrink-0" />
            <div className="space-y-4 flex-1 w-full">
              <Skeleton variant="text" width="50%" height={40} />
              <Skeleton variant="text" width="30%" height={22} />
              <Skeleton variant="text" width="80%" height={18} />
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={56} />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !artist) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <EmptyState
            icon={<Mic2 className="w-8 h-8" />}
            title="Artist not found"
            description="This artist doesn't exist or could not be loaded."
            action={{ label: "Browse Music", onClick: () => router.push("/music") }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-body-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
          <div className="shrink-0">
            <ArtistAvatar artist={artist} />
          </div>
          <div className="space-y-3 min-w-0 text-center sm:text-left">
            <h1 className="text-heading-lg font-bold text-content-primary">{artist.name}</h1>
            {artist.disambiguation && (
              <p className="text-body-sm text-content-muted">{artist.disambiguation}</p>
            )}
            {artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {artist.genres.slice(0, 6).map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full text-caption bg-surface-elevated border border-border-glass text-content-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {artist.biography && (
              <p className="text-body-sm text-content-secondary leading-relaxed max-w-lg">
                {artist.biography}
              </p>
            )}
          </div>
        </div>

        {/* Top Tracks */}
        {tracks.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-heading-sm font-semibold text-content-primary">Popular Tracks</h2>
            <div className="rounded-2xl border border-border-glass overflow-hidden divide-y divide-border-subtle">
              {tracks.slice(0, 10).map((track, idx) => (
                <div
                  key={track.mbid || idx}
                  className="flex items-center gap-4 px-4 py-3 bg-surface-primary hover:bg-surface-elevated transition-colors group"
                >
                  <span className="text-caption text-content-muted w-5 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  {track.artwork_url || (track.album?.cover_art_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(track.artwork_url ?? track.album?.cover_art_url) ?? ""}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-border-glass"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border-glass shrink-0 flex items-center justify-center">
                      <Mic2 className="w-4 h-4 text-content-muted" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/music/track/${track.mbid}`}
                      className="text-body-sm font-medium text-content-primary hover:text-accent-blue transition-colors truncate block"
                    >
                      {track.title}
                    </Link>
                    {track.album && (
                      <Link
                        href={`/music/album/${track.album.mbid}`}
                        className="text-caption text-content-muted hover:text-content-secondary transition-colors truncate block"
                      >
                        {track.album.title}
                      </Link>
                    )}
                  </div>
                  {track.duration_ms > 0 && (
                    <span className="text-caption text-content-muted shrink-0">
                      {formatDuration(track.duration_ms)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-heading-sm font-semibold text-content-primary">Albums & Releases</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {albums.map((album) => (
                <MediaCard
                  key={album.mbid}
                  id={album.mbid}
                  title={album.title}
                  subtitle={album.release_date?.slice(0, 4) ?? undefined}
                  artworkUrl={album.cover_art_url ?? ""}
                  type="music"
                  aspectRatio="square"
                  year={album.release_date?.slice(0, 4) ?? undefined}
                  onClick={() => router.push(`/music/album/${album.mbid}`)}
                />
              ))}
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

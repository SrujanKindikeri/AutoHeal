"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Disc, Mic2, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaCard } from "@/components/ui/MediaCard";
import {
  getMusicTrending,
  getMusicPopularArtists,
  getMusicNewReleases,
  getMusicGenres,
} from "@/lib/musicApi";
import type {
  MBTrack,
  MBArtist,
  MBAlbum,
} from "@/types/music";

const SKELETON_COUNT = 6;

function formatDuration(ms: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MusicRow({
  title,
  viewAllHref,
  loading,
  children,
}: {
  title: string;
  viewAllHref?: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-heading-sm font-semibold text-content-primary">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-body-sm font-medium text-accent-blue hover:text-accent-blue-hover transition-colors"
          >
            View all
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="shrink-0 w-36 sm:w-44 space-y-3">
                <Skeleton variant="rectangular" className="w-full aspect-square" />
                <Skeleton variant="text" width="72%" />
                <Skeleton variant="text" width="40%" />
              </div>
            ))
          : children}
      </div>
    </section>
  );
}

export default function MusicPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<MBTrack[]>([]);
  const [artists, setArtists] = useState<MBArtist[]>([]);
  const [albums, setAlbums] = useState<MBAlbum[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getMusicTrending(),
      getMusicPopularArtists(),
      getMusicNewReleases(),
      getMusicGenres(),
    ])
      .then(([t, a, r, g]) => {
        setTracks(t.results);
        setArtists(a.results);
        setAlbums(r.results);
        setGenres(g.genres);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoading(false));
  }, []);

  const featured = tracks[0] ?? null;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-10">

        {/* Featured */}
        {loading ? (
          <Skeleton variant="rectangular" className="w-full" height={260} />
        ) : featured ? (
          <div
            onClick={() => router.push(`/music/track/${featured.mbid}`)}
            className="cursor-pointer relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-surface-elevated to-surface-secondary border border-border-glass p-8 flex gap-8 items-center group hover:border-white/20 transition-all"
          >
            {/* Artwork */}
            <div className="shrink-0 w-32 h-32 sm:w-48 sm:h-48 rounded-2xl overflow-hidden bg-surface-primary border border-border-glass shadow-xl">
              {featured.artwork_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.artwork_url}
                  alt={featured.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-blue/30 to-accent-purple/30">
                  <Music className="w-12 h-12 text-accent-blue/60" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="min-w-0 space-y-2">
              <div className="text-caption text-accent-blue font-semibold uppercase tracking-widest">
                Featured Track
              </div>
              <h1 className="text-heading-lg font-bold text-content-primary truncate group-hover:text-accent-blue transition-colors">
                {featured.title}
              </h1>
              <p className="text-body-md text-content-secondary truncate">
                {featured.artists.map((a) => a.name).join(", ")}
              </p>
              {featured.album && (
                <p className="text-body-sm text-content-muted truncate">
                  {featured.album.title}
                </p>
              )}
              {featured.duration_ms > 0 && (
                <p className="text-caption text-content-muted">
                  {formatDuration(featured.duration_ms)}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Trending Tracks */}
        <MusicRow title="Trending Tracks" viewAllHref="/music/trending" loading={loading}>
          {tracks.length === 0 ? (
            <p className="text-body-sm text-content-muted py-6">Nothing here yet.</p>
          ) : (
            tracks.slice(0, 12).map((track) => (
              <div key={track.mbid} className="shrink-0 w-36 sm:w-44">
                <MediaCard
                  id={track.mbid}
                  title={track.title}
                  subtitle={track.artists.map((a) => a.name).join(", ")}
                  artworkUrl={track.artwork_url ?? ""}
                  type="music"
                  aspectRatio="square"
                  duration={track.duration_ms ? formatDuration(track.duration_ms) : undefined}
                  onClick={() => router.push(`/music/track/${track.mbid}`)}
                />
              </div>
            ))
          )}
        </MusicRow>

        {/* Popular Artists */}
        <MusicRow title="Popular Artists" loading={loading}>
          {artists.length === 0 ? (
            <p className="text-body-sm text-content-muted py-6">Nothing here yet.</p>
          ) : (
            artists.slice(0, 12).map((artist) => (
              <div key={artist.mbid} className="shrink-0 w-36 sm:w-44">
                <MediaCard
                  id={artist.mbid}
                  title={artist.name}
                  subtitle={artist.genres.slice(0, 2).join(", ") || artist.disambiguation || "Artist"}
                  artworkUrl={artist.image_url ?? ""}
                  type="music"
                  aspectRatio="square"
                  onClick={() => router.push(`/music/artist/${artist.mbid}`)}
                />
              </div>
            ))
          )}
        </MusicRow>

        {/* New Releases */}
        <MusicRow title="New Releases" viewAllHref="/music/new-releases" loading={loading}>
          {albums.length === 0 ? (
            <p className="text-body-sm text-content-muted py-6">Nothing here yet.</p>
          ) : (
            albums.slice(0, 12).map((album) => (
              <div key={album.mbid} className="shrink-0 w-36 sm:w-44">
                <MediaCard
                  id={album.mbid}
                  title={album.title}
                  subtitle={album.artists.map((a) => a.name).join(", ")}
                  artworkUrl={album.cover_art_url ?? ""}
                  type="music"
                  aspectRatio="square"
                  year={album.release_date?.slice(0, 4) ?? undefined}
                  onClick={() => router.push(`/music/album/${album.mbid}`)}
                />
              </div>
            ))
          )}
        </MusicRow>

        {/* Genre Exploration */}
        {(genres.length > 0 || loading) && (
          <section className="space-y-4">
            <h2 className="text-heading-sm font-semibold text-content-primary px-1">
              Browse by Genre
            </h2>
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" width={80} height={36} className="rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Link
                    key={genre}
                    href={`/music/genres?genre=${encodeURIComponent(genre)}`}
                    className="px-4 py-2 rounded-full text-body-sm font-medium bg-surface-elevated border border-border-glass text-content-secondary hover:text-content-primary hover:bg-surface-glass hover:border-white/20 transition-all"
                  >
                    {genre}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Attribution */}
        <p className="text-caption text-content-muted pb-4 text-center">
          Music metadata provided by{" "}
          <a
            href="https://musicbrainz.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            MusicBrainz
          </a>{" "}
          (CC0). Cover art from{" "}
          <a
            href="https://coverartarchive.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-blue hover:underline"
          >
            Cover Art Archive
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}

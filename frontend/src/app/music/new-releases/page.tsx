"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "@/components/ui/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMusicNewReleases } from "@/lib/musicApi";
import type { MBAlbum } from "@/types/music";
import { Disc } from "lucide-react";

export default function NewReleasesPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<MBAlbum[]>([]);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMusicNewReleases(1)
      .then((res) => {
        setAlbums(res.results);
        setTotalResults(res.total_results);
        setPage(1);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    getMusicNewReleases(page + 1)
      .then((res) => {
        setAlbums((prev) => [...prev, ...res.results]);
        setPage(page + 1);
        setTotalResults(res.total_results);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setLoadingMore(false));
  };

  const hasMore = albums.length < totalResults;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <h1 className="text-heading-lg font-bold text-content-primary">New Releases</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton variant="rectangular" className="w-full aspect-square" />
                <Skeleton variant="text" width="72%" />
                <Skeleton variant="text" width="40%" />
              </div>
            ))}
          </div>
        ) : albums.length === 0 ? (
          <EmptyState
            icon={<Disc className="w-8 h-8" />}
            title="No releases available"
            description="New releases could not be loaded. Please try again later."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {albums.map((album) => (
                <MediaCard
                  key={album.mbid}
                  id={album.mbid}
                  title={album.title}
                  subtitle={album.artists.map((a) => a.name).join(", ")}
                  artworkUrl={album.cover_art_url ?? ""}
                  type="music"
                  aspectRatio="square"
                  year={album.release_date?.slice(0, 4) ?? undefined}
                  onClick={() => router.push(`/music/album/${album.mbid}`)}
                />
              ))}
            </div>

            {hasMore && (
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

        <p className="text-caption text-content-muted pb-4 text-center">
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

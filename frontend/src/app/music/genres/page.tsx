"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaCard } from "@/components/ui/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMusicGenres, searchMusic } from "@/lib/musicApi";
import type { MBArtist, MBAlbum, MusicSearchResults } from "@/types/music";
import { Music } from "lucide-react";

function GenresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedGenre = searchParams.get("genre") ?? null;

  const [genres, setGenres] = useState<string[]>([]);
  const [artists, setArtists] = useState<MBArtist[]>([]);
  const [albums, setAlbums] = useState<MBAlbum[]>([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    getMusicGenres()
      .then((res) => setGenres(res.genres))
      .catch(() => setGenres([]))
      .finally(() => setGenresLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGenre) {
      setArtists([]);
      setAlbums([]);
      return;
    }
    setResultsLoading(true);
    searchMusic(selectedGenre, "all")
      .then((res) => {
        const data = res as MusicSearchResults;
        setArtists(data.artists ?? []);
        setAlbums(data.albums ?? []);
      })
      .catch(() => {
        setArtists([]);
        setAlbums([]);
      })
      .finally(() => setResultsLoading(false));
  }, [selectedGenre]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <h1 className="text-heading-lg font-bold text-content-primary">Browse by Genre</h1>

      {/* Genre chips */}
      {genresLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={80} height={36} className="rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => router.push(`/music/genres?genre=${encodeURIComponent(genre)}`)}
              className={`px-4 py-2 rounded-full text-body-sm font-medium transition-all border ${
                selectedGenre === genre
                  ? "bg-accent-blue text-white border-accent-blue"
                  : "bg-surface-elevated border-border-glass text-content-secondary hover:text-content-primary hover:bg-surface-glass hover:border-white/20"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {selectedGenre && (
        <>
          {resultsLoading ? (
            <div className="space-y-6">
              <Skeleton variant="text" width={200} height={28} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton variant="rectangular" className="w-full aspect-square" />
                    <Skeleton variant="text" width="72%" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {artists.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-heading-sm font-semibold text-content-primary">
                    Artists — {selectedGenre}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {artists.map((artist) => (
                      <MediaCard
                        key={artist.mbid}
                        id={artist.mbid}
                        title={artist.name}
                        subtitle={artist.disambiguation ?? "Artist"}
                        artworkUrl={artist.image_url ?? ""}
                        type="music"
                        aspectRatio="square"
                        onClick={() => router.push(`/music/artist/${artist.mbid}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {albums.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-heading-sm font-semibold text-content-primary">
                    Albums — {selectedGenre}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                </section>
              )}

              {artists.length === 0 && albums.length === 0 && (
                <EmptyState
                  icon={<Music className="w-8 h-8" />}
                  title={`No results for "${selectedGenre}"`}
                  description="Try selecting a different genre."
                />
              )}
            </>
          )}
        </>
      )}

      <p className="text-caption text-content-muted pb-4 text-center">
        Music metadata provided by{" "}
        <a href="https://musicbrainz.org" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
          MusicBrainz
        </a>{" "}
        (CC0).
      </p>
    </div>
  );
}

export default function GenresPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><Skeleton variant="rectangular" height={400} /></div>}>
        <GenresContent />
      </Suspense>
    </AppShell>
  );
}

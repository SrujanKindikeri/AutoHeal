"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Share2, Plus, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMusicTrack, getPlaylists, addTrackToPlaylist } from "@/lib/musicApi";
import { useAuthStore } from "@/store/authStore";
import type { MBTrack, Playlist } from "@/types/music";

function formatDuration(ms: number): string {
  if (!ms) return "";
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [track, setTrack] = useState<MBTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getMusicTrack(id as string)
      .then((data) => setTrack(data))
      .catch((err) => {
        if (err?.status === 404 || err?.message?.includes("404")) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPlaylistModal = () => {
    setShowPlaylistModal(true);
    setPlaylistsLoading(true);
    getPlaylists()
      .then((data) => setPlaylists(data))
      .catch(() => setPlaylists([]))
      .finally(() => setPlaylistsLoading(false));
  };

  const handleAddToPlaylist = (playlistId: string) => {
    if (!track) return;
    setAddingTo(playlistId);
    addTrackToPlaylist(playlistId, {
      track_mbid: track.mbid,
      title: track.title,
      artist_name: track.artists.map((a) => a.name).join(", "),
      album_name: track.album?.title ?? "",
      duration_ms: track.duration_ms,
      artwork_url: track.artwork_url ?? "",
    })
      .then(() => {
        setAddSuccess(playlistId);
        setTimeout(() => {
          setAddSuccess(null);
          setShowPlaylistModal(false);
        }, 1500);
      })
      .catch(() => {/* silently degrade */})
      .finally(() => setAddingTo(null));
  };

  const artworkUrl = track?.artwork_url ?? track?.album?.cover_art_url ?? null;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-8">
            <Skeleton variant="rectangular" className="w-64 h-64 shrink-0" />
            <div className="space-y-4 flex-1">
              <Skeleton variant="text" width="60%" height={36} />
              <Skeleton variant="text" width="40%" height={24} />
              <Skeleton variant="text" width="30%" height={20} />
              <Skeleton variant="text" width="20%" height={18} />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (notFound || !track) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <EmptyState
            icon={<Music className="w-8 h-8" />}
            title="Track not found"
            description="This track doesn't exist or could not be loaded."
            action={{ label: "Browse Music", onClick: () => router.push("/music") }}
          />
        </div>
      </AppShell>
    );
  }

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
          {/* Artwork */}
          <div className="shrink-0 w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden bg-surface-elevated border border-border-glass shadow-xl">
            {artworkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artworkUrl} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-blue/20 to-accent-purple/20">
                <Music className="w-16 h-16 text-accent-blue/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h1 className="text-heading-lg font-bold text-content-primary truncate flex-1">
                {track.title}
              </h1>
              {track.is_explicit && (
                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-content-muted/20 text-content-muted rounded border border-content-muted/30">
                  E
                </span>
              )}
            </div>

            {/* Artists */}
            <div className="flex flex-wrap gap-1 text-body-md text-content-secondary">
              {track.artists.map((artist, i) => (
                <React.Fragment key={artist.mbid}>
                  <Link
                    href={`/music/artist/${artist.mbid}`}
                    className="hover:text-accent-blue transition-colors"
                  >
                    {artist.name}
                  </Link>
                  {i < track.artists.length - 1 && <span>,</span>}
                </React.Fragment>
              ))}
            </div>

            {/* Album */}
            {track.album && (
              <p className="text-body-sm text-content-muted">
                Album:{" "}
                <Link
                  href={`/music/album/${track.album.mbid}`}
                  className="text-content-secondary hover:text-accent-blue transition-colors"
                >
                  {track.album.title}
                </Link>
              </p>
            )}

            {/* Duration */}
            {track.duration_ms > 0 && (
              <p className="text-body-sm text-content-muted">
                Duration: {formatDuration(track.duration_ms)}
              </p>
            )}

            {/* Genres */}
            {track.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {track.genres.slice(0, 5).map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full text-caption bg-surface-elevated border border-border-glass text-content-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {isAuthenticated && (
                <button
                  onClick={handleOpenPlaylistModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-body-sm font-medium bg-accent-blue text-white hover:bg-accent-blue-hover transition"
                >
                  <Plus className="w-4 h-4" />
                  Save to Playlist
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-body-sm font-medium bg-surface-elevated border border-border-glass text-content-secondary hover:text-content-primary hover:bg-surface-glass transition"
              >
                <Share2 className="w-4 h-4" />
                {copied ? "Copied!" : "Share"}
              </button>
            </div>

            <p className="text-caption text-content-muted pt-2">Metadata from MusicBrainz (CC0)</p>
          </div>
        </div>

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

      {/* Playlist modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated border border-border-glass rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h2 className="text-heading-sm font-bold text-content-primary">Save to Playlist</h2>
            {playlistsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={44} />
                ))}
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-body-sm text-content-muted">No playlists yet. Create one first.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    disabled={addingTo === pl.id}
                    className={`w-full text-left px-4 py-3 rounded-xl text-body-sm font-medium border transition ${
                      addSuccess === pl.id
                        ? "bg-accent-emerald/20 border-accent-emerald/30 text-accent-emerald"
                        : "bg-surface-primary border-border-glass text-content-primary hover:bg-surface-glass hover:border-white/20"
                    } disabled:opacity-50`}
                  >
                    {addSuccess === pl.id ? "Added!" : pl.name}
                    <span className="text-content-muted ml-2 text-caption">{pl.track_count} tracks</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowPlaylistModal(false)}
              className="w-full py-2 rounded-xl text-body-sm font-medium text-content-muted hover:text-content-primary transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

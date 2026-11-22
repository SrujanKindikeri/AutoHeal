"use client";

import React, { useState, useCallback } from "react";
import { Search, Plus, Check, Music2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import type { MBTrack, PlaylistTrack } from "@/types/music";
import { searchMusic } from "@/lib/musicApi";
import { addTrackToPlaylist } from "@/lib/musicApi";
import type { MusicPaginatedResponse, MusicSearchResults } from "@/types/music";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AddTrackModalProps {
  playlistId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded: (track: PlaylistTrack) => void;
}

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  playlistId,
  isOpen,
  onClose,
  onAdded,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MBTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const data = await searchMusic(q, "track");
      const paginated = data as MusicPaginatedResponse<MBTrack>;
      setResults(paginated.results ?? []);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleAdd = async (track: MBTrack) => {
    setAddingId(track.mbid);
    setError(null);
    try {
      const pt = await addTrackToPlaylist(playlistId, {
        track_mbid: track.mbid,
        title: track.title,
        artist_name: track.artists[0]?.name ?? "Unknown Artist",
        album_name: track.album?.title ?? "",
        duration_ms: track.duration_ms,
        artwork_url: track.artwork_url ?? "",
      });
      setAddedIds((prev) => new Set(prev).add(track.mbid));
      onAdded(pt);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add track";
      setError(msg.includes("already") ? "Track is already in this playlist." : msg);
    } finally {
      setAddingId(null);
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setAddedIds(new Set());
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Tracks" size="lg">
      <div className="space-y-4">
        <Input
          placeholder="Search for tracks…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          autoFocus
        />

        {error && (
          <p className="text-sm text-accent-coral px-1">{error}</p>
        )}

        {searching && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-surface-primary animate-pulse" />
            ))}
          </div>
        )}

        {!searching && results.length === 0 && query.length >= 2 && (
          <p className="text-sm text-content-secondary text-center py-6">No tracks found.</p>
        )}

        {!searching && results.length > 0 && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {results.map((track) => {
              const added = addedIds.has(track.mbid);
              const adding = addingId === track.mbid;
              return (
                <div
                  key={track.mbid}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-black/[0.04] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface-primary flex items-center justify-center shrink-0">
                    {track.artwork_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={track.artwork_url} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-4 h-4 text-content-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-content-primary truncate">{track.title}</div>
                    <div className="text-xs text-content-secondary truncate">
                      {track.artists.map((a) => a.name).join(", ")}
                      {track.album && ` · ${track.album.title}`}
                    </div>
                  </div>
                  <span className="text-xs text-content-muted tabular-nums shrink-0">
                    {formatMs(track.duration_ms)}
                  </span>
                  <button
                    onClick={() => !added && handleAdd(track)}
                    disabled={added || adding}
                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      added
                        ? "bg-accent-emerald/15 text-emerald-700"
                        : "bg-surface-primary text-content-secondary hover:bg-accent-blue/15 hover:text-accent-blue"
                    } disabled:opacity-60`}
                    aria-label={added ? "Added" : `Add ${track.title}`}
                  >
                    {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddTrackModal;

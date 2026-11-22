"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Search, GripVertical, Trash2, Users, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PlaylistHeader } from "@/components/music/PlaylistHeader";
import { PlaylistTrackRow, DragHandle } from "@/components/music/PlaylistTrackRow";
import { CollaboratorList } from "@/components/music/CollaboratorList";
import { AddTrackModal } from "@/components/music/AddTrackModal";
import { PlaylistShareModal } from "@/components/music/PlaylistShareModal";
import { useAuthStore } from "@/store/authStore";
import {
  getPlaylist,
  deletePlaylist,
  duplicatePlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  getCollaborators,
  updateCollaboratorPermission,
  removeCollaborator,
} from "@/lib/musicApi";
import type {
  CollaboratorPermission,
  PlaylistCollaborator,
  PlaylistDetail,
  PlaylistTrack,
} from "@/types/music";

const PAGE_SIZE = 50;

type SortField = "position" | "title" | "artist_name" | "album_name" | "added_at";

function sortTracks(tracks: PlaylistTrack[], field: SortField): PlaylistTrack[] {
  return [...tracks].sort((a, b) => {
    if (field === "position") return a.position - b.position;
    if (field === "added_at") return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
    return (a[field] ?? "").localeCompare(b[field] ?? "");
  });
}

// ---------------------------------------------------------------------------
// Sortable track item wrapper
// ---------------------------------------------------------------------------

interface SortableTrackProps {
  track: PlaylistTrack;
  index: number;
  canEdit: boolean;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onRemove: () => void;
}

function SortableTrack({ track, index, canEdit, isSelected, onSelect, onRemove }: SortableTrackProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <PlaylistTrackRow
        track={track}
        position={index}
        onRemove={canEdit ? onRemove : undefined}
        onSelect={onSelect}
        isSelected={isSelected}
        dragHandle={canEdit ? <span {...listeners}><DragHandle /></span> : undefined}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>("position");
  const [filterQuery, setFilterQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isOwner = isAuthenticated && playlist?.owner_username === user?.username;
  const canEdit = isOwner || collaborators.some(
    (c) => c.username === user?.username && c.permission === "editor"
  );

  // Load playlist
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPlaylist(id)
      .then((pl) => {
        setPlaylist(pl);
        setTracks([...pl.tracks].sort((a, b) => a.position - b.position));
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load playlist")
      )
      .finally(() => setLoading(false));
  }, [id]);

  // Load collaborators (owner only)
  useEffect(() => {
    if (!id || !isOwner) return;
    getCollaborators(id).then(setCollaborators).catch(() => {});
  }, [id, isOwner]);

  // Filtered + sorted tracks
  const displayTracks = useMemo(() => {
    let t = sortTracks(tracks, sortField);
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      t = t.filter(
        (tr) =>
          tr.title.toLowerCase().includes(q) ||
          tr.artist_name.toLowerCase().includes(q) ||
          tr.album_name.toLowerCase().includes(q)
      );
    }
    return t;
  }, [tracks, sortField, filterQuery]);

  const visibleTracks = displayTracks.slice(0, visibleCount);

  // Drag end handler — only works when sorted by position
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || sortField !== "position") return;
      const oldIndex = tracks.findIndex((t) => t.id === active.id);
      const newIndex = tracks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(tracks, oldIndex, newIndex).map((t, i) => ({
        ...t,
        position: i,
      }));
      // Optimistic update
      setTracks(reordered);
      try {
        await reorderPlaylistTracks(
          id,
          reordered.map((t) => ({ id: t.id, position: t.position }))
        );
      } catch {
        // Rollback
        setTracks(tracks);
      }
    },
    [id, tracks, sortField]
  );

  const handleRemoveTrack = useCallback(
    async (track: PlaylistTrack) => {
      const prev = tracks;
      setTracks((t) => t.filter((x) => x.id !== track.id));
      setSelectedIds((s) => { const n = new Set(s); n.delete(track.id); return n; });
      try {
        await removeTrackFromPlaylist(id, track.track_mbid);
        setPlaylist((p) => p ? { ...p, track_count: p.track_count - 1 } : p);
      } catch {
        setTracks(prev);
      }
    },
    [id, tracks]
  );

  const handleBulkRemove = async () => {
    const toRemove = tracks.filter((t) => selectedIds.has(t.id));
    for (const t of toRemove) await handleRemoveTrack(t);
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deletePlaylist(id);
      router.push("/playlists");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete playlist");
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;
    try {
      const copy = await duplicatePlaylist(id);
      router.push(`/playlists/${copy.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to duplicate playlist");
    }
  };

  const handleTrackAdded = (track: PlaylistTrack) => {
    setTracks((t) => [...t, track]);
    setPlaylist((p) => p ? { ...p, track_count: p.track_count + 1 } : p);
  };

  const handleChangePermission = async (userId: string, permission: CollaboratorPermission) => {
    const updated = await updateCollaboratorPermission(id, userId, permission);
    setCollaborators((c) => c.map((x) => x.user_id === userId ? updated : x));
  };

  const handleRemoveCollaborator = async (userId: string) => {
    await removeCollaborator(id, userId);
    setCollaborators((c) => c.filter((x) => x.user_id !== userId));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="h-40 rounded-2xl bg-surface-primary animate-pulse" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-surface-primary animate-pulse" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !playlist) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-red-400">{error ?? "Playlist not found."}</p>
          <Link href="/playlists">
            <Button variant="glass">← Back to playlists</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <Link href="/playlists" className="text-content-muted hover:text-content-secondary text-sm transition-colors">
          ← Playlists
        </Link>

        {/* Header */}
        <PlaylistHeader
          playlist={playlist}
          isOwner={!!isOwner}
          canEdit={!!canEdit}
          onEdit={() => router.push(`/playlists/${id}/edit`)}
          onShare={() => setShowShare(true)}
          onDuplicate={handleDuplicate}
          onDelete={isOwner ? () => setShowDeleteConfirm(true) : undefined}
          onAddTracks={canEdit ? () => setShowAddTrack(true) : undefined}
        />

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
            <p className="text-sm text-red-300">Delete &ldquo;{playlist.name}&rdquo;? This cannot be undone.</p>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
              <Button size="sm" variant="glass" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Track controls */}
        {tracks.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Search tracks…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-content-muted">Sort:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-xs bg-surface-primary border border-border-glass text-content-secondary rounded-lg px-2 py-1.5 focus:outline-none focus:border-accent-blue"
              >
                <option value="position">Order</option>
                <option value="title">Title</option>
                <option value="artist_name">Artist</option>
                <option value="album_name">Album</option>
                <option value="added_at">Date added</option>
              </select>
            </div>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="danger"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleBulkRemove}
              >
                Remove {selectedIds.size} selected
              </Button>
            )}
          </div>
        )}

        {/* Track listing */}
        {tracks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-content-muted">This playlist is empty.</p>
            {canEdit && (
              <Button size="sm" variant="glass" onClick={() => setShowAddTrack(true)}>
                Add tracks
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {sortField === "position" && canEdit ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleTracks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleTracks.map((track, idx) => (
                    <SortableTrack
                      key={track.id}
                      track={track}
                      index={idx}
                      canEdit={canEdit}
                      isSelected={selectedIds.has(track.id)}
                      onSelect={(sel) =>
                        setSelectedIds((s) => {
                          const n = new Set(s);
                          sel ? n.add(track.id) : n.delete(track.id);
                          return n;
                        })
                      }
                      onRemove={() => handleRemoveTrack(track)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              visibleTracks.map((track, idx) => (
                <PlaylistTrackRow
                  key={track.id}
                  track={track}
                  position={idx}
                  onRemove={canEdit ? () => handleRemoveTrack(track) : undefined}
                  isSelected={selectedIds.has(track.id)}
                  onSelect={(sel) =>
                    setSelectedIds((s) => {
                      const n = new Set(s);
                      sel ? n.add(track.id) : n.delete(track.id);
                      return n;
                    })
                  }
                />
              ))
            )}

            {displayTracks.length > visibleCount && (
              <div className="pt-4 text-center">
                <Button
                  size="sm"
                  variant="glass"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load more ({displayTracks.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Collaborators */}
        {(isOwner || collaborators.length > 0) && (
          <section className="bg-surface-primary/50 border border-border-subtle rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCollaborators((s) => !s)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.03] transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-content-secondary">
                <Users className="w-4 h-4" />
                Collaborators ({collaborators.length})
              </div>
              {showCollaborators ? (
                <ChevronUp className="w-4 h-4 text-content-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-content-muted" />
              )}
            </button>
            {showCollaborators && (
              <div className="px-5 pb-4">
                <CollaboratorList
                  collaborators={collaborators}
                  isOwner={!!isOwner}
                  onChangePermission={isOwner ? handleChangePermission : undefined}
                  onRemove={isOwner ? handleRemoveCollaborator : undefined}
                />
              </div>
            )}
          </section>
        )}

        {/* Listen Together note */}
        {/* Listen Together: pass playlist.id as playlist_id when creating a room.
            Preview data available: playlist.name, playlist.track_count */}
      </div>

      {/* Modals */}
      {showAddTrack && (
        <AddTrackModal
          playlistId={id}
          isOpen={showAddTrack}
          onClose={() => setShowAddTrack(false)}
          onAdded={handleTrackAdded}
        />
      )}

      {showShare && playlist && (
        <PlaylistShareModal
          playlistId={id}
          visibility={playlist.visibility}
          isOpen={showShare}
          onClose={() => setShowShare(false)}
        />
      )}
    </AppShell>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Music2, Disc3, User } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import {
  getLibraryMusic,
  getFollowedArtists,
  removeLibraryItem,
  unfollowArtist,
  LibraryItem,
  UserFollow,
} from "@/lib/libraryApi";

type MusicTab = "tracks" | "albums" | "artists";

export default function LibraryMusicPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeTab, setActiveTab] = useState<MusicTab>("tracks");
  const [tracks, setTracks] = useState<LibraryItem[]>([]);
  const [albums, setAlbums] = useState<LibraryItem[]>([]);
  const [follows, setFollows] = useState<UserFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      getLibraryMusic({ content_type: "music_track" }),
      getLibraryMusic({ content_type: "album" }),
      getFollowedArtists(),
    ])
      .then(([t, a, f]) => {
        setTracks(t.results);
        setAlbums(a.results);
        setFollows(f.results);
      })
      .catch((e) => setError(e.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleRemoveTrack = async (id: string) => {
    await removeLibraryItem(id);
    setTracks((prev) => prev.filter((i) => i.id !== id));
  };

  const handleRemoveAlbum = async (id: string) => {
    await removeLibraryItem(id);
    setAlbums((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUnfollow = async (artistId: string, followId: string) => {
    await unfollowArtist(artistId);
    setFollows((prev) => prev.filter((f) => f.id !== followId));
  };

  const tabs: { id: MusicTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "tracks", label: "Liked Tracks", icon: <Music2 className="w-4 h-4" />, count: tracks.length },
    { id: "albums", label: "Saved Albums", icon: <Disc3 className="w-4 h-4" />, count: albums.length },
    { id: "artists", label: "Following", icon: <User className="w-4 h-4" />, count: follows.length },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/library" className="text-content-muted hover:text-content-secondary text-sm">← Library</Link>
          <h1 className="text-2xl font-bold text-content-primary">Music</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-primary/60 rounded-2xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-white text-content-primary shadow-sm" : "text-content-muted hover:text-content-secondary"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="ml-1 text-xs bg-surface-primary px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-surface-primary/60 animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral">{error}</div>
        ) : (
          <>
            {activeTab === "tracks" && (
              tracks.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🎵</div>
                  <p className="text-content-muted">No liked tracks yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-accent-blue hover:text-accent-blue">Browse music →</Link>
                </div>
              ) : (
                <div className="bg-surface-primary/50 border border-border-subtle rounded-2xl px-4">
                  {tracks.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
                      <Music2 className="w-4 h-4 text-content-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-content-primary truncate">Track {item.object_id.slice(0, 8)}…</div>
                        <div className="text-xs text-content-muted">{new Date(item.added_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleRemoveTrack(item.id)} className="text-content-muted hover:text-accent-coral transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "albums" && (
              albums.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">💿</div>
                  <p className="text-content-muted">No saved albums yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-accent-blue hover:text-accent-blue">Browse music →</Link>
                </div>
              ) : (
                <div className="bg-surface-primary/50 border border-border-subtle rounded-2xl px-4">
                  {albums.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
                      <Disc3 className="w-4 h-4 text-content-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-content-primary truncate">Album {item.object_id.slice(0, 8)}…</div>
                        <div className="text-xs text-content-muted">{new Date(item.added_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleRemoveAlbum(item.id)} className="text-content-muted hover:text-accent-coral transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "artists" && (
              follows.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🎤</div>
                  <p className="text-content-muted">Not following any artists yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-accent-blue hover:text-accent-blue">Browse artists →</Link>
                </div>
              ) : (
                <div className="bg-surface-primary/50 border border-border-subtle rounded-2xl px-4">
                  {follows.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 py-3 border-b border-border-subtle last:border-0">
                      <User className="w-4 h-4 text-content-muted shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-content-primary truncate">Artist {f.artist_id.slice(0, 8)}…</div>
                        <div className="text-xs text-content-muted">{new Date(f.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleUnfollow(f.artist_id, f.id)} className="text-xs px-2 py-1 rounded-lg bg-surface-primary text-content-muted hover:bg-accent-coral/20 hover:text-accent-coral transition-colors">
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

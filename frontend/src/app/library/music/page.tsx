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
          <Link href="/library" className="text-white/40 hover:text-white/70 text-sm">← Library</Link>
          <h1 className="text-2xl font-bold text-white">Music</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-2xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white/80"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="ml-1 text-xs bg-white/[0.1] px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">{error}</div>
        ) : (
          <>
            {activeTab === "tracks" && (
              tracks.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="text-4xl mb-3">🎵</div>
                  <p className="text-white/50">No liked tracks yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">Browse music →</Link>
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4">
                  {tracks.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
                      <Music2 className="w-4 h-4 text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">Track {item.object_id.slice(0, 8)}…</div>
                        <div className="text-xs text-white/40">{new Date(item.added_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleRemoveTrack(item.id)} className="text-white/30 hover:text-red-400 transition-colors">
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
                  <p className="text-white/50">No saved albums yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">Browse music →</Link>
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4">
                  {albums.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
                      <Disc3 className="w-4 h-4 text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">Album {item.object_id.slice(0, 8)}…</div>
                        <div className="text-xs text-white/40">{new Date(item.added_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleRemoveAlbum(item.id)} className="text-white/30 hover:text-red-400 transition-colors">
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
                  <p className="text-white/50">Not following any artists yet.</p>
                  <Link href="/music" className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300">Browse artists →</Link>
                </div>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl px-4">
                  {follows.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 py-3 border-b border-white/[0.06] last:border-0">
                      <User className="w-4 h-4 text-white/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white/80 truncate">Artist {f.artist_id.slice(0, 8)}…</div>
                        <div className="text-xs text-white/40">{new Date(f.created_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleUnfollow(f.artist_id, f.id)} className="text-xs px-2 py-1 rounded-lg bg-white/[0.06] text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors">
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

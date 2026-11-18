"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Link2, Globe } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { createPlaylist } from "@/lib/musicApi";
import type { PlaylistVisibility } from "@/types/music";

const visibilityOptions: {
  value: PlaylistVisibility;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you and invited collaborators can view",
    icon: <Lock className="w-4 h-4" />,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Anyone with the link can view",
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    value: "public",
    label: "Public",
    description: "Discoverable by anyone",
    icon: <Globe className="w-4 h-4" />,
  },
];

export default function CreatePlaylistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PlaylistVisibility>("private");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Playlist name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const playlist = await createPlaylist({
        name: name.trim(),
        description: description.trim(),
        visibility,
        artwork_url: artworkUrl.trim() || undefined,
      });
      router.push(`/playlists/${playlist.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create playlist.");
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/playlists" className="text-white/40 hover:text-white/70 text-sm transition-colors">
            ← Playlists
          </Link>
          <h1 className="text-2xl font-bold text-white">New Playlist</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            placeholder="My playlist"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/60">
              Description
            </label>
            <textarea
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/60">
              Visibility
            </label>
            <div className="space-y-2">
              {visibilityOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    visibility === opt.value
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span
                    className={visibility === opt.value ? "text-blue-400" : "text-white/40"}
                  >
                    {opt.icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-white/80">
                      {opt.label}
                    </div>
                    <div className="text-xs text-white/40">{opt.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Artwork URL (optional)"
            placeholder="https://example.com/image.jpg"
            value={artworkUrl}
            onChange={(e) => setArtworkUrl(e.target.value)}
            type="url"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="flex-1"
            >
              Create Playlist
            </Button>
            <Link href="/playlists">
              <Button type="button" variant="glass">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

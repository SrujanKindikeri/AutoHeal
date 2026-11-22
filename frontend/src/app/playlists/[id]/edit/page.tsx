"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Link2, Globe } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/store/authStore";
import { getPlaylist, updatePlaylist } from "@/lib/musicApi";
import type { Playlist, PlaylistVisibility } from "@/types/music";

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

export default function EditPlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PlaylistVisibility>("private");
  const [artworkUrl, setArtworkUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!id) return;
    getPlaylist(id)
      .then((pl) => {
        setPlaylist(pl);
        setName(pl.name);
        setDescription(pl.description);
        setVisibility(pl.visibility);
        setArtworkUrl(pl.artwork_url ?? "");
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load playlist")
      )
      .finally(() => setLoading(false));
  }, [id, isAuthenticated, router]);

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-surface-primary animate-pulse" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!playlist) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400">{error ?? "Playlist not found."}</p>
        </div>
      </AppShell>
    );
  }

  // Only owner or editor can edit
  const canEdit = playlist.owner_username === user?.username;
  if (!canEdit) {
    router.replace(`/playlists/${id}`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Playlist name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePlaylist(id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
        artwork_url: artworkUrl.trim() || undefined,
      });
      router.push(`/playlists/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save changes.");
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/playlists/${id}`}
            className="text-content-muted hover:text-content-secondary text-sm transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-content-primary">Edit Playlist</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-content-secondary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface-primary border border-border-glass rounded-xl px-3 py-2.5 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-blue resize-none"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-content-secondary">
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
                      ? "border-accent-blue/30 bg-accent-blue/10"
                      : "border-border-subtle bg-surface-primary/50 hover:bg-surface-primary"
                  }`}
                >
                  <span className={visibility === opt.value ? "text-accent-blue" : "text-content-muted"}>
                    {opt.icon}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-content-primary">{opt.label}</div>
                    <div className="text-xs text-content-muted">{opt.description}</div>
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" isLoading={saving} className="flex-1">
              Save Changes
            </Button>
            <Link href={`/playlists/${id}`}>
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

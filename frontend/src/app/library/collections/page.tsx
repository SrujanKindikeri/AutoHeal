"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, Trash2, Lock, Globe } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import { getCollections, createCollection, deleteCollection, UserCollection } from "@/lib/libraryApi";

function CreateCollectionModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (col: UserCollection) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const col = await createCollection({ name: name.trim(), description, privacy });
      onCreate(col);
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to create collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-border-strong rounded-3xl p-6 space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold text-content-primary">New Collection</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-content-secondary mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Picks"
              className="w-full bg-surface-primary border border-border-glass rounded-xl px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-blue/50"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-surface-primary border border-border-glass rounded-xl px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent-blue/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-content-secondary mb-1">Privacy</label>
            <div className="flex gap-2">
              {(["private", "public"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrivacy(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors border ${
                    privacy === p
                      ? "bg-accent-blue/15 border-accent-blue/30 text-accent-blue"
                      : "bg-surface-primary border border-border-subtle text-content-muted"
                  }`}
                >
                  {p === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-accent-coral">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-2xl bg-surface-primary text-content-secondary hover:bg-surface-primary/70 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2 rounded-2xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    getCollections()
      .then((r) => setCollections(r.results))
      .catch((e) => setError(e.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleDelete = async (id: string) => {
    await deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/library" className="text-content-muted hover:text-content-secondary text-sm">← Library</Link>
            <h1 className="text-2xl font-bold text-content-primary">Collections</h1>
          </div>
          {isAuthenticated && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Collection
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-surface-primary/60 animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-accent-coral/10 border border-accent-coral/20 text-accent-coral">{error}</div>
        ) : collections.length === 0 ? (
          <div className="py-20 text-center">
            <FolderOpen className="w-12 h-12 text-content-muted mx-auto mb-3" />
            <p className="text-content-muted mb-4">No collections yet. Create one to organise your entertainment.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Collection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {collections.map((col) => (
              <div key={col.id} className="relative group">
                <Link
                  href={`/library/collections/${col.id}`}
                  className="block p-5 rounded-2xl bg-surface-primary/60 border border-border-subtle hover:bg-surface-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-content-primary truncate">{col.name}</div>
                      {col.description && (
                        <div className="text-xs text-content-muted mt-1 line-clamp-2">{col.description}</div>
                      )}
                    </div>
                    {col.privacy === "private" ? (
                      <Lock className="w-3.5 h-3.5 text-content-muted shrink-0 mt-0.5" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-content-muted shrink-0 mt-0.5" />
                    )}
                  </div>
                  <div className="mt-3 text-xs text-content-muted">{col.item_count} items</div>
                </Link>
                {/* Delete button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {confirmDeleteId === col.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(col.id)} className="text-xs px-2 py-1 rounded-lg bg-accent-coral/20 text-accent-coral hover:bg-accent-coral/30">Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 py-1 rounded-lg bg-surface-primary text-content-muted">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmDeleteId(col.id); }}
                      className="p-1.5 rounded-lg bg-surface-primary text-content-muted hover:text-accent-coral hover:bg-accent-coral/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCollectionModal
          onClose={() => setShowCreate(false)}
          onCreate={(col) => setCollections((prev) => [col, ...prev])}
        />
      )}
    </AppShell>
  );
}

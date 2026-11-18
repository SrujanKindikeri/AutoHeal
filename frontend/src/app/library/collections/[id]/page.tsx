"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Plus, GripVertical, Lock, Globe, Check, X } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { useAuthStore } from "@/store/authStore";
import {
  getCollection,
  updateCollection,
  deleteCollection,
  removeCollectionItem,
  reorderCollectionItems,
  UserCollectionDetail,
  CollectionItem,
} from "@/lib/libraryApi";

const CONTENT_TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tvshow: "TV Show",
  music_track: "Track",
  album: "Album",
  artist: "Artist",
};

function EditNameModal({
  current,
  currentDesc,
  currentPrivacy,
  onClose,
  onSave,
}: {
  current: string;
  currentDesc: string;
  currentPrivacy: "public" | "private";
  onClose: () => void;
  onSave: (name: string, desc: string, privacy: "public" | "private") => void;
}) {
  const [name, setName] = useState(current);
  const [desc, setDesc] = useState(currentDesc);
  const [privacy, setPrivacy] = useState<"public" | "private">(currentPrivacy);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try { await onSave(name.trim(), desc, privacy); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a1e] border border-white/[0.1] rounded-3xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white">Edit Collection</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1">Privacy</label>
            <div className="flex gap-2">
              {(["private", "public"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setPrivacy(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors border ${
                    privacy === p ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/[0.04] border-white/[0.08] text-white/50"
                  }`}>
                  {p === "private" ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-2xl bg-white/[0.06] text-white/60 hover:bg-white/[0.1] text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold disabled:opacity-50">{loading ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [collection, setCollection] = useState<UserCollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !id) { setLoading(false); return; }
    setLoading(true);
    getCollection(id)
      .then(setCollection)
      .catch((e) => setError(e.message ?? "Not found"))
      .finally(() => setLoading(false));
  }, [isAuthenticated, id]);

  const handleSave = async (name: string, desc: string, privacy: "public" | "private") => {
    if (!collection) return;
    const updated = await updateCollection(collection.id, { name, description: desc, privacy });
    setCollection((prev) => prev ? { ...prev, ...updated } : prev);
    setShowEdit(false);
  };

  const handleDelete = async () => {
    if (!collection) return;
    await deleteCollection(collection.id);
    router.push("/library/collections");
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!collection) return;
    await removeCollectionItem(collection.id, itemId);
    setCollection((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev);
    setConfirmRemoveId(null);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-4">
          <div className="h-8 w-48 bg-white/[0.06] rounded-xl animate-pulse" />
          <div className="h-4 w-64 bg-white/[0.04] rounded-xl animate-pulse" />
          <div className="mt-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
        </div>
      </AppShell>
    );
  }

  if (error || !collection) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
          <p className="text-red-400">{error ?? "Collection not found."}</p>
          <Link href="/library/collections" className="mt-3 inline-block text-sm text-blue-400">← Back to collections</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link href="/library/collections" className="text-white/40 hover:text-white/70 text-sm">← Collections</Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                {collection.name}
                {collection.privacy === "private" ? (
                  <Lock className="w-4 h-4 text-white/30" />
                ) : (
                  <Globe className="w-4 h-4 text-white/30" />
                )}
              </h1>
              {collection.description && (
                <p className="text-sm text-white/50 mt-1">{collection.description}</p>
              )}
              <p className="text-xs text-white/30 mt-1">{collection.items.length} items</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white text-sm transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              {confirmDelete ? (
                <div className="flex gap-1">
                  <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm"><Check className="w-3.5 h-3.5" /> Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.05] text-white/50 hover:bg-white/[0.1] text-sm"><X className="w-3.5 h-3.5" /> Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/10 text-white/40 hover:text-red-400 text-sm transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items */}
        {collection.items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📂</div>
            <p className="text-white/50">This collection is empty.</p>
            <p className="text-xs text-white/30 mt-1">Add items from movie, show, or music pages.</p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            {collection.items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-0 group"
              >
                <span className="w-5 text-xs text-white/20 text-center shrink-0">{index + 1}</span>
                <GripVertical className="w-4 h-4 text-white/15 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate font-medium">
                    {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type} — {item.object_id.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-white/30">{new Date(item.added_at).toLocaleDateString()}</div>
                </div>
                {confirmRemoveId === item.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleRemoveItem(item.id)} className="text-xs px-2 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">Remove</button>
                    <button onClick={() => setConfirmRemoveId(null)} className="text-xs px-2 py-1 rounded-lg bg-white/[0.05] text-white/50">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemoveId(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showEdit && (
        <EditNameModal
          current={collection.name}
          currentDesc={collection.description}
          currentPrivacy={collection.privacy}
          onClose={() => setShowEdit(false)}
          onSave={handleSave}
        />
      )}
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getProfileMe, updateProfileMe, logoutUser } from "@/lib/authApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Film,
  Music,
  User,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Settings,
  Edit3,
  LogOut,
  Sparkles,
  Lock,
  Eye,
  Users,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, logout, initAuth } = useAuthStore();

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user) {
      setEditFullName(user.full_name || "");
      setEditBio(user.profile?.bio || "");
    }
  }, [user, isAuthenticated, isLoading, router]);

  const handleCopyId = () => {
    if (user?.movieflow_id) {
      navigator.clipboard.writeText(user.movieflow_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await updateProfileMe({
        full_name: editFullName,
        bio: editBio,
      });
      updateUser(updated);
      setEditing(false);
      setMsg("Profile updated successfully.");
    } catch (err: any) {
      setMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore
    }
    logout();
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08080a] text-white">
        <div className="text-xs text-white/50">Loading profile...</div>
      </div>
    );
  }

  const avatarSrc =
    user.profile?.avatar_url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Banner Card */}
        <div className="relative rounded-3xl overflow-hidden apple-glass-card border border-white/[0.1] p-8 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#2997ff]/10 via-[#bf5af2]/10 to-transparent blur-3xl -z-10" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-xl">
                <img src={avatarSrc} alt={user.username} className="w-full h-full object-cover" />
              </div>
              <Link
                href="/complete-profile"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#2997ff] text-white shadow-md hover:scale-110 transition-transform"
                title="Change Avatar"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Profile Info */}
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                    <span>{user.full_name || user.username}</span>
                    {user.is_email_verified && (
                      <span title="Verified Account">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </span>
                    )}
                  </h1>
                  <div className="text-xs text-white/50 font-mono mt-0.5">@{user.username}</div>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-end">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="px-3.5 py-1.5 rounded-full apple-button text-xs text-white flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{editing ? "Cancel" : "Edit Profile"}</span>
                  </button>

                  <Link
                    href="/settings/account"
                    className="p-2 rounded-full apple-button text-white/70 hover:text-white"
                    title="Account Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* MovieFlow ID Badge (Immutable & Copyable) */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                <span className="text-[10px] uppercase font-mono text-white/40 tracking-wider">
                  MovieFlow ID:
                </span>
                <span className="text-xs font-mono font-bold text-[#2997ff]">
                  {user.movieflow_id}
                </span>
                <button
                  onClick={handleCopyId}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  title="Copy MovieFlow ID"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Bio */}
              <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-2xl">
                {user.profile?.bio || (
                  <span className="italic text-white/40">No bio added yet. Tell others what entertainment you love!</span>
                )}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-white/50 pt-1 font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {user.is_email_verified ? "Email Verified" : "Unverified"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Edit Form */}
        {editing && (
          <form onSubmit={handleSaveProfile} className="p-6 rounded-3xl apple-glass-card space-y-4">
            <h3 className="text-sm font-semibold text-white">Edit Your Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-white/70">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/70">MovieFlow ID (Permanent & Immutable)</label>
                <input
                  type="text"
                  value={user.movieflow_id}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-white/40 text-xs font-mono cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/70">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl apple-button text-xs text-white/70 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {msg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
            {msg}
          </div>
        )}

        {/* Interests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Movie Interests */}
          <div className="p-6 rounded-3xl apple-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-[#2997ff]" />
                <h3 className="font-semibold text-white text-sm">Movie Interests</h3>
              </div>
              <Link href="/complete-profile" className="text-xs text-[#2997ff] hover:underline">
                Edit
              </Link>
            </div>

            {user.profile?.preferred_movie_genres && user.profile.preferred_movie_genres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.profile.preferred_movie_genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2997ff] text-xs font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No movie genres selected yet.</p>
            )}
          </div>

          {/* Music Interests */}
          <div className="p-6 rounded-3xl apple-glass-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#ff375f]" />
                <h3 className="font-semibold text-white text-sm">Music Interests</h3>
              </div>
              <Link href="/complete-profile" className="text-xs text-[#ff375f] hover:underline">
                Edit
              </Link>
            </div>

            {user.profile?.preferred_music_genres && user.profile.preferred_music_genres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {user.profile.preferred_music_genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[#ff375f] text-xs font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">No music genres selected yet.</p>
            )}
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <Link
            href="/settings/account"
            className="p-5 rounded-2xl apple-glass-card hover:border-white/20 transition-all space-y-2"
          >
            <Lock className="w-5 h-5 text-[#bf5af2]" />
            <div className="font-semibold text-white text-sm">Security & Password</div>
            <p className="text-xs text-white/50">Update password and manage session tokens.</p>
          </Link>

          <Link
            href="/settings/account"
            className="p-5 rounded-2xl apple-glass-card hover:border-white/20 transition-all space-y-2"
          >
            <Eye className="w-5 h-5 text-emerald-400" />
            <div className="font-semibold text-white text-sm">Privacy Controls</div>
            <p className="text-xs text-white/50">Manage watch history and listening visibility.</p>
          </Link>

          <button
            onClick={handleLogout}
            className="p-5 rounded-2xl apple-glass-card hover:border-red-500/30 hover:bg-red-500/5 transition-all space-y-2 text-left"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <div className="font-semibold text-red-400 text-sm">Sign Out</div>
            <p className="text-xs text-white/50">Safely log out of your MovieFlow session.</p>
          </button>
        </div>
      </div>
    </AppShell>
  );
}

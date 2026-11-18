"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { changePassword, updateProfileMe, logoutUser } from "@/lib/authApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Lock,
  Eye,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  User,
  Film,
  Music,
} from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, logout, initAuth } = useAuthStore();

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Privacy state
  const [watchVisibility, setWatchVisibility] = useState<"public" | "friends_only" | "private">(
    "friends_only"
  );
  const [listenVisibility, setListenVisibility] = useState<"public" | "friends_only" | "private">(
    "friends_only"
  );
  const [showActivity, setShowActivity] = useState(true);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (user?.profile) {
      setWatchVisibility(user.profile.watch_history_visibility || "friends_only");
      setListenVisibility(user.profile.listening_history_visibility || "friends_only");
      setShowActivity(user.profile.show_activity_status ?? true);
    }
  }, [user, isAuthenticated, isLoading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMsg({ type: "success", text: res.message || "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err.message || "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePrivacySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrivacyLoading(true);
    setPrivacyMsg(null);
    try {
      const updated = await updateProfileMe({
        watch_history_visibility: watchVisibility,
        listening_history_visibility: listenVisibility,
        show_activity_status: showActivity,
      });
      updateUser(updated);
      setPrivacyMsg("Privacy preferences saved successfully.");
    } catch (err: any) {
      setPrivacyMsg(err.message || "Failed to save privacy settings.");
    } finally {
      setPrivacyLoading(false);
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
        <div className="text-xs text-white/50">Loading settings...</div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8 w-full space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Account Settings</h1>
          <p className="text-xs text-white/60">
            Manage your credentials, MovieFlow ID, and social privacy controls.
          </p>
        </div>

        {/* Identity Overview */}
        <div className="p-6 rounded-3xl apple-glass-card space-y-4">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-white/70">
            Identity & Account Overview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <div className="text-white/40 uppercase text-[10px]">MovieFlow ID (Permanent)</div>
              <div className="text-sm font-bold text-[#2997ff]">{user.movieflow_id}</div>
              <div className="text-[10px] text-white/50 font-sans">Database enforced unique ID</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <div className="text-white/40 uppercase text-[10px]">Email Address</div>
              <div className="text-xs text-white font-sans font-medium truncate">{user.email}</div>
              <div className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-1">
              <div className="text-white/40 uppercase text-[10px]">Username</div>
              <div className="text-xs text-white font-sans font-medium">@{user.username}</div>
              <div className="text-[10px] text-white/50 font-sans">Discovery handle</div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <form onSubmit={handlePrivacySave} className="p-6 rounded-3xl apple-glass-card space-y-6">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-white/70">
              Social & History Privacy
            </h2>
          </div>

          {privacyMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              {privacyMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Watch History Visibility */}
            <div className="space-y-2">
              <label className="text-xs text-white/70 flex items-center gap-1.5 font-medium">
                <Film className="w-4 h-4 text-[#2997ff]" />
                <span>Watch History Visibility</span>
              </label>
              <select
                value={watchVisibility}
                onChange={(e: any) => setWatchVisibility(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
              >
                <option value="public" className="bg-[#121217]">Public to everyone</option>
                <option value="friends_only" className="bg-[#121217]">Friends only</option>
                <option value="private" className="bg-[#121217]">Private (Only me)</option>
              </select>
            </div>

            {/* Listening History Visibility */}
            <div className="space-y-2">
              <label className="text-xs text-white/70 flex items-center gap-1.5 font-medium">
                <Music className="w-4 h-4 text-[#ff375f]" />
                <span>Listening History Visibility</span>
              </label>
              <select
                value={listenVisibility}
                onChange={(e: any) => setListenVisibility(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
              >
                <option value="public" className="bg-[#121217]">Public to everyone</option>
                <option value="friends_only" className="bg-[#121217]">Friends only</option>
                <option value="private" className="bg-[#121217]">Private (Only me)</option>
              </select>
            </div>
          </div>

          {/* Activity status toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <div>
              <div className="text-xs font-medium text-white">Broadcast Live Activity Status</div>
              <div className="text-[11px] text-white/50">
                Allow friends to see when you are currently watching or listening.
              </div>
            </div>
            <input
              type="checkbox"
              checked={showActivity}
              onChange={(e) => setShowActivity(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#2997ff] focus:ring-0"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={privacyLoading}
              className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-semibold disabled:opacity-50 transition-all"
            >
              {privacyLoading ? "Saving..." : "Save Privacy Preferences"}
            </button>
          </div>
        </form>

        {/* Change Password */}
        <form onSubmit={handlePasswordChange} className="p-6 rounded-3xl apple-glass-card space-y-6">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#bf5af2]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider font-mono text-white/70">
              Change Password
            </h2>
          </div>

          {passwordMsg && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs text-white/70">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/70">New Password (8+ characters)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/70">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#2997ff] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="py-2.5 px-5 rounded-xl bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold disabled:opacity-50 transition-all"
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>

        {/* Danger Zone */}
        <div className="p-6 rounded-3xl apple-glass-card border border-red-500/20 space-y-4">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider font-mono">
            Session & Security
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-medium text-white">Sign out of MovieFlow</div>
              <div className="text-[11px] text-white/50">
                Terminates your current session and invalidates active refresh tokens.
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center gap-2 self-start sm:self-auto transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Everywhere</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

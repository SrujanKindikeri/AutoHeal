"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { changePassword, logoutUser } from "@/lib/authApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Lock,
  Shield,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, initAuth } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [user, isAuthenticated, isLoading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
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
      setPasswordMsg({
        type: "success",
        text: res.message || "Password changed successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({
        type: "error",
        text: err.message || "Failed to change password.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAll = async () => {
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xs text-content-muted">Loading…</div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-accent-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Security
            </h1>
          </div>
          <p className="text-sm text-content-secondary">
            Manage your password and active sessions.
          </p>
        </div>

        {/* Change Password */}
        <form
          onSubmit={handlePasswordChange}
          className="p-6 rounded-3xl apple-glass-card space-y-5"
        >
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-accent-purple" />
            <h2 className="text-sm font-semibold text-content-primary">
              Change Password
            </h2>
          </div>

          {passwordMsg && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
                passwordMsg.type === "success"
                  ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald"
                  : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"
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

          <div className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors"
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary">
                New Password{" "}
                <span className="text-content-muted">(8+ characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors"
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm new password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-content-secondary">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-surface-primary border border-border-glass text-content-primary text-sm focus:outline-none focus:border-accent-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {passwordLoading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>

        {/* Session management */}
        <div className="p-6 rounded-3xl apple-glass-card border border-accent-coral/20 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent-coral" />
            <h2 className="text-sm font-semibold text-content-primary">
              Session Management
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-content-primary">
                Sign out everywhere
              </div>
              <div className="text-xs text-content-muted mt-0.5">
                Terminates your current session and invalidates active refresh
                tokens.
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral border border-accent-coral/30 text-sm font-medium transition-colors self-start sm:self-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { updateProfileMe } from "@/lib/authApi";
import { AppShell } from "@/components/navigation/AppShell";
import {
  Bell,
  Users,
  MessageSquare,
  Radio,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface NotificationPreferences {
  friend_request_notifications: boolean;
  friend_accepted_notifications: boolean;
  room_invite_notifications: boolean;
  activity_notifications: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  friend_request_notifications: true,
  friend_accepted_notifications: true,
  room_invite_notifications: true,
  activity_notifications: false,
};

interface ToggleRowProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({
  label,
  description,
  icon,
  checked,
  onChange,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border-subtle last:border-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 text-content-muted">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-content-primary">{label}</div>
          <div className="text-xs text-content-muted mt-0.5">{description}</div>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ml-4 ${
          checked ? "bg-accent-blue" : "bg-black/[0.12]"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, initAuth } =
    useAuthStore();

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{
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
  }, [isAuthenticated, isLoading, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      // updateProfileMe accepts notification preference fields; backend stores them in the profile
      const updated = await updateProfileMe(prefs as any);
      updateUser(updated);
      setMsg({ type: "success", text: "Notification preferences saved." });
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err.message || "Failed to save preferences.",
      });
    } finally {
      setSaving(false);
    }
  };

  const setPref = (key: keyof NotificationPreferences) => (val: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: val }));
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
            <Bell className="w-6 h-6 text-accent-blue" />
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Notifications
            </h1>
          </div>
          <p className="text-sm text-content-secondary">
            Choose which events trigger a notification.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-6 rounded-3xl apple-glass-card space-y-1">
            <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-4">
              Social
            </h2>

            <ToggleRow
              label="Friend requests"
              description="Notify me when someone sends me a friend request."
              icon={<Users className="w-4 h-4" />}
              checked={prefs.friend_request_notifications}
              onChange={setPref("friend_request_notifications")}
            />
            <ToggleRow
              label="Friend accepted"
              description="Notify me when someone accepts my friend request."
              icon={<Users className="w-4 h-4" />}
              checked={prefs.friend_accepted_notifications}
              onChange={setPref("friend_accepted_notifications")}
            />
          </div>

          <div className="p-6 rounded-3xl apple-glass-card space-y-1">
            <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider mb-4">
              Rooms & Activity
            </h2>

            <ToggleRow
              label="Room invitations"
              description="Notify me when I am invited to a watch or listen room."
              icon={<Radio className="w-4 h-4" />}
              checked={prefs.room_invite_notifications}
              onChange={setPref("room_invite_notifications")}
            />
            <ToggleRow
              label="Activity updates"
              description="Notify me about trending activity from people I follow."
              icon={<MessageSquare className="w-4 h-4" />}
              checked={prefs.activity_notifications}
              onChange={setPref("activity_notifications")}
            />
          </div>

          {msg && (
            <div
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
                msg.type === "success"
                  ? "bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald"
                  : "bg-accent-coral/10 border-accent-coral/20 text-accent-coral"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

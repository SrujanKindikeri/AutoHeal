"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { NotificationItem } from "@/types/social";
import { SearchBar } from "@/components/ui/SearchBar";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import {
  Bell,
  Check,
  Settings,
  User as UserIcon,
  LogOut,
  Sparkles,
  Activity,
} from "lucide-react";

export interface AppHeaderProps {
  notifications?: NotificationItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onOpenDiagnostics?: () => void;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onOpenDiagnostics,
  className = "",
}) => {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [searchVal, setSearchVal] = useState("");
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/friends?tab=search&q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const userMenuItems: DropdownItem[] = [
    {
      id: "profile",
      label: "My Profile",
      icon: <UserIcon className="w-4 h-4" />,
      onClick: () => router.push("/profile"),
    },
    {
      id: "settings",
      label: "Account Settings",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => router.push("/settings/account"),
    },
    ...(onOpenDiagnostics
      ? [
          {
            id: "diagnostics",
            label: "System Diagnostics",
            icon: <Activity className="w-4 h-4 text-accent-blue" />,
            onClick: onOpenDiagnostics,
            divider: true,
          },
        ]
      : []),
    {
      id: "logout",
      label: "Sign Out",
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      divider: !onOpenDiagnostics,
      onClick: () => {
        logout();
        router.push("/login");
      },
    },
  ];

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-surface-background/80 backdrop-blur-2xl border-b border-border-subtle px-4 sm:px-8 flex items-center justify-between gap-4 select-none ${className}`}
    >
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="max-w-md w-full">
        <SearchBar
          size="sm"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onClear={() => setSearchVal("")}
          placeholder="Search movies, albums, or @users..."
          shortcutHint="⌘K"
        />
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* System Diagnostics Trigger */}
        {onOpenDiagnostics && (
          <button
            type="button"
            onClick={onOpenDiagnostics}
            title="System & Network Status"
            className="p-2 rounded-xl text-content-muted hover:text-content-primary hover:bg-black/[0.04] transition hidden sm:inline-flex"
          >
            <Activity className="w-4 h-4 text-accent-blue" />
          </button>
        )}

        {/* Notifications Dropdown */}
        {isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
              className="relative p-2.5 rounded-xl text-content-secondary hover:text-content-primary hover:bg-black/[0.04] transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-blue ring-2 ring-surface-background" />
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-3xl apple-glass-elevated p-4 border border-border-strong shadow-glass-elevated z-50 animate-scale-in space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                  <div className="flex items-center gap-2 text-body-sm font-bold text-content-primary">
                    <Bell className="w-4 h-4 text-accent-blue" />
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-accent-blue/20 text-accent-blue text-caption font-mono">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && onMarkAllRead && (
                    <button
                      onClick={() => {
                        onMarkAllRead();
                        setNotifDropdownOpen(false);
                      }}
                      className="text-caption text-content-muted hover:text-content-primary transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-body-sm text-content-muted">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-2xl border text-left space-y-1 transition ${
                          n.is_read
                            ? "bg-surface-primary/40 border-border-subtle text-content-secondary"
                            : "bg-surface-primary border-border-glass text-content-primary"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-body-sm font-semibold truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-content-muted font-mono shrink-0">
                            {new Date(n.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-caption text-content-secondary line-clamp-2">
                          {n.message}
                        </p>
                        {n.verb === "friend_request_received" && (
                          <Link
                            href="/friends"
                            onClick={() => setNotifDropdownOpen(false)}
                            className="inline-block text-caption text-accent-blue font-semibold hover:underline pt-0.5"
                          >
                            Respond to request &rarr;
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Avatar Menu or Sign In */}
        {isAuthenticated && user ? (
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 p-1 rounded-2xl hover:bg-black/[0.04] transition">
                <Avatar
                  name={user.full_name || user.username}
                  size="sm"
                  src={user.profile?.avatar_url}
                />
              </button>
            }
            items={userMenuItems}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-xl text-body-sm font-semibold text-content-secondary hover:text-content-primary transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-1.5 rounded-xl text-body-sm font-semibold bg-accent-blue hover:bg-accent-blue-hover text-white shadow-md shadow-blue-500/20 transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

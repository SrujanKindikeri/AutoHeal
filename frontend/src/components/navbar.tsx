"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { logoutUser } from "@/lib/authApi";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/socialApi";
import { NotificationItem } from "@/types/social";
import {
  Film,
  Music,
  Users,
  Compass,
  User as UserIcon,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  Search,
  Bell,
  Check,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, initAuth, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.results || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
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

  return (
    <header className="sticky top-0 z-50 apple-glass border-b border-white/[0.08] backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2997ff] to-[#bf5af2] flex items-center justify-center shadow-lg shadow-[#2997ff]/20 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-lg tracking-tight text-white">MovieFlow</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              pathname === "/" ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Home
          </Link>
          <Link
            href="/movies"
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              pathname?.startsWith("/movies") ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Movies
          </Link>
          <Link
            href="/music"
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              pathname?.startsWith("/music") ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Music
          </Link>
          <Link
            href="/friends"
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              pathname?.startsWith("/friends") ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Friends
          </Link>
          <Link
            href="/profile"
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              pathname === "/profile" ? "bg-white/[0.1] text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Profile
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setDropdownOpen(false);
                  }}
                  className="relative p-2 rounded-full apple-button text-white/70 hover:text-white transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#2997ff] ring-2 ring-[#08080a]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl apple-glass-card shadow-2xl p-3 border border-white/[0.1] z-50 backdrop-blur-2xl space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-[#2997ff]" />
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#2997ff]/20 text-[#2997ff] text-[10px] font-mono">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-white/50 hover:text-white"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-white/40">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-2.5 rounded-xl border text-left space-y-1 transition-colors ${
                              notif.is_read
                                ? "bg-white/[0.02] border-white/[0.04] text-white/60"
                                : "bg-white/[0.06] border-white/[0.08] text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-white">{notif.title}</span>
                              <span className="text-[9px] text-white/30 font-mono">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/70">{notif.message}</p>
                            {notif.verb === 'friend_request_received' && (
                              <Link
                                href="/friends"
                                onClick={() => setNotifOpen(false)}
                                className="inline-block text-[10px] text-[#2997ff] hover:underline font-medium pt-1"
                              >
                                View friend request &rarr;
                              </Link>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-full apple-button text-xs text-white"
                >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#2997ff] to-[#bf5af2] flex items-center justify-center text-[11px] font-bold">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold leading-none">{user.username}</div>
                  <div className="text-[10px] text-white/50 font-mono mt-0.5">{user.movieflow_id}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/50" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl apple-glass-card shadow-2xl p-1.5 border border-white/[0.1] z-50 backdrop-blur-2xl"
                  onClick={() => setDropdownOpen(false)}
                >
                  <div className="p-3 border-b border-white/[0.06] mb-1">
                    <div className="text-xs font-medium text-white">{user.full_name || user.username}</div>
                    <div className="text-[11px] font-mono text-[#2997ff] mt-0.5">{user.movieflow_id}</div>
                    <div className="text-[10px] text-white/40 truncate">{user.email}</div>
                  </div>

                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-[#2997ff]" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/settings/account"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#bf5af2]" />
                    <span>Account Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-full text-xs font-medium text-white/80 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 rounded-full bg-[#2997ff] hover:bg-[#0071e3] text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

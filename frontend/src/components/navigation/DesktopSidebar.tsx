"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { logoutUser } from "@/lib/authApi";
import { NavigationItem } from "@/components/ui/NavigationItem";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import {
  Film,
  Music,
  Users,
  Compass,
  Radio,
  Video,
  Bookmark,
  ListMusic,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  Sparkles,
  Copy,
  Check,
  ChevronRight,
  Tv,
  Search,
} from "lucide-react";

export interface DesktopSidebarProps {
  pendingRequestCount?: number;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  className?: string;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  pendingRequestCount = 0,
  unreadNotificationCount = 0,
  onOpenNotifications,
  className = "",
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.movieflow_id) {
      navigator.clipboard.writeText(user.movieflow_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Ignore
    }
    logout();
    router.push("/login");
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 w-64 bg-surface-primary/95 border-r border-border-subtle backdrop-blur-2xl z-30 hidden md:flex flex-col justify-between p-4 overflow-y-auto no-scrollbar select-none ${className}`}
    >
      <div className="space-y-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 px-2 py-1.5 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-blue to-accent-purple flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-0.5">
            <div className="font-bold text-heading-sm text-content-primary tracking-tight">
              MovieFlow
            </div>
            <div className="text-[10px] text-content-muted uppercase tracking-wider font-semibold">
              Entertainment
            </div>
          </div>
        </Link>

        {/* Navigation Group 1: Entertainment Discovery */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
            Discover
          </div>
          <NavigationItem
            href="/"
            label="Home"
            icon={<Compass className="w-4 h-4" />}
            isActive={pathname === "/"}
          />
          <NavigationItem
            href="/movies"
            label="Movies"
            icon={<Film className="w-4 h-4" />}
            isActive={pathname?.startsWith("/movies")}
          />
          <NavigationItem
            href="/shows"
            label="TV Shows"
            icon={<Tv className="w-4 h-4" />}
            isActive={pathname?.startsWith("/shows")}
          />
          <NavigationItem
            href="/search"
            label="Search"
            icon={<Search className="w-4 h-4" />}
            isActive={pathname?.startsWith("/search")}
          />
          <NavigationItem
            href="/music"
            label="Music"
            icon={<Music className="w-4 h-4" />}
            isActive={pathname?.startsWith("/music")}
          />
          <NavigationItem
            href="/watch-together"
            label="Watch Together"
            icon={<Video className="w-4 h-4" />}
            isActive={pathname?.startsWith("/watch-together")}
          />
          <NavigationItem
            href="/listen-together"
            label="Listen Together"
            icon={<Radio className="w-4 h-4" />}
            isActive={pathname?.startsWith("/listen-together")}
          />
        </div>

        {/* Navigation Group 2: Social & Network */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
            Social
          </div>
          <NavigationItem
            href="/friends"
            label="Friends"
            icon={<Users className="w-4 h-4" />}
            isActive={pathname?.startsWith("/friends")}
            badge={pendingRequestCount > 0 ? pendingRequestCount : undefined}
          />
          <button
            onClick={onOpenNotifications}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-body-sm font-semibold transition-all duration-200 select-none text-content-secondary hover:text-content-primary hover:bg-white/[0.06]`}
          >
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 text-content-muted">
                <Bell className="w-4 h-4" />
              </span>
              <span>Notifications</span>
            </div>
            {unreadNotificationCount > 0 && (
              <span className="text-caption px-2 py-0.5 rounded-full bg-accent-blue text-white font-mono font-bold">
                {unreadNotificationCount}
              </span>
            )}
          </button>
        </div>

        {/* Navigation Group 3: Library */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold text-content-muted uppercase tracking-wider">
            Library
          </div>
          <NavigationItem
            href="/watchlist"
            label="Watchlist"
            icon={<Bookmark className="w-4 h-4" />}
            isActive={pathname?.startsWith("/watchlist")}
          />
          <NavigationItem
            href="/playlists"
            label="Playlists"
            icon={<ListMusic className="w-4 h-4" />}
            isActive={pathname?.startsWith("/playlists")}
          />
        </div>
      </div>

      {/* Bottom Identity Card / Auth state */}
      <div className="pt-4 border-t border-border-subtle space-y-2">
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div
              onClick={() => router.push("/profile")}
              className="p-3 rounded-2xl bg-surface-secondary/70 hover:bg-surface-secondary border border-border-glass transition-colors cursor-pointer group flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={user.full_name || user.username}
                  size="sm"
                  src={user.profile?.avatar_url}
                />
                <div className="min-w-0">
                  <div className="text-body-sm font-bold text-content-primary truncate group-hover:text-accent-blue transition-colors">
                    {user.full_name || user.username}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title="Click to copy MovieFlow ID"
                    className="flex items-center gap-1 text-[11px] font-mono text-content-muted hover:text-content-primary transition"
                  >
                    <span>{user.movieflow_id}</span>
                    {copied ? (
                      <Check className="w-3 h-3 text-accent-emerald" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-content-muted group-hover:text-content-primary transition-transform group-hover:translate-x-0.5" />
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-caption">
              <Link
                href="/settings/account"
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-content-secondary hover:text-content-primary transition border border-border-subtle"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent-coral/10 hover:bg-accent-coral/20 text-accent-coral transition border border-accent-coral/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-2xl apple-glass-card space-y-2.5">
            <div className="text-body-sm font-semibold text-content-primary">
              Experience MovieFlow
            </div>
            <p className="text-caption text-content-muted leading-relaxed">
              Watch movies and listen to music together in real-time rooms.
            </p>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/login"
                className="w-full text-center py-2 rounded-xl text-body-sm font-semibold bg-accent-blue hover:bg-accent-blue-hover text-white transition shadow-md shadow-blue-500/20"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="w-full text-center py-2 rounded-xl text-body-sm font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-content-primary border border-border-subtle transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

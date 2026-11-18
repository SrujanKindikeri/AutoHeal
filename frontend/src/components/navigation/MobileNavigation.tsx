"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { logoutUser } from "@/lib/authApi";
import { Drawer } from "@/components/ui/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import {
  Compass,
  Film,
  Music,
  Users,
  Menu,
  Video,
  Radio,
  Bookmark,
  ListMusic,
  Bell,
  Settings,
  User as UserIcon,
  LogOut,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Tv,
  Search,
} from "lucide-react";

export interface MobileNavigationProps {
  pendingRequestCount?: number;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  pendingRequestCount = 0,
  unreadNotificationCount = 0,
  onOpenNotifications,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (user?.movieflow_id) {
      navigator.clipboard.writeText(user.movieflow_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    setDrawerOpen(false);
    try {
      await logoutUser();
    } catch {
      // Ignore
    }
    logout();
    router.push("/login");
  };

  const navItems = [
    { href: "/", label: "Home", icon: <Compass className="w-5 h-5" /> },
    { href: "/movies", label: "Movies", icon: <Film className="w-5 h-5" /> },
    { href: "/music", label: "Music", icon: <Music className="w-5 h-5" /> },
    {
      href: "/friends",
      label: "Friends",
      icon: <Users className="w-5 h-5" />,
      badge: pendingRequestCount > 0 ? pendingRequestCount : undefined,
    },
  ];

  return (
    <>
      {/* Fixed Bottom Glass Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden apple-glass-elevated border-t border-border-strong px-3 py-2 flex items-center justify-around select-none backdrop-blur-2xl"
      >
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
                isActive ? "text-accent-blue" : "text-content-muted hover:text-content-primary"
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-accent-blue text-white ring-2 ring-surface-background">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Trigger */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-200 ${
            drawerOpen ? "text-accent-blue" : "text-content-muted hover:text-content-primary"
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent-blue ring-2 ring-surface-background" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-1">More</span>
        </button>
      </nav>

      {/* Slide-over Drawer for Secondary Destinations */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Menu & Destinations"
        side="right"
      >
        <div className="space-y-6">
          {/* User Card if Authenticated */}
          {isAuthenticated && user ? (
            <div
              onClick={() => {
                setDrawerOpen(false);
                router.push("/profile");
              }}
              className="p-4 rounded-2xl bg-surface-primary/80 border border-border-glass flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={user.full_name || user.username}
                  size="md"
                  src={user.profile?.avatar_url}
                />
                <div className="min-w-0 text-left">
                  <div className="text-body-md font-bold text-content-primary truncate">
                    {user.full_name || user.username}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyId();
                    }}
                    className="flex items-center gap-1.5 text-caption font-mono text-content-muted hover:text-content-primary"
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
              <ChevronRight className="w-5 h-5 text-content-muted" />
            </div>
          ) : (
            <div className="p-4 rounded-2xl apple-glass-card space-y-3">
              <div className="text-body-md font-bold text-content-primary">
                Welcome to MovieFlow
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setDrawerOpen(false)}
                  className="py-2.5 text-center rounded-xl bg-accent-blue text-white text-body-sm font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setDrawerOpen(false)}
                  className="py-2.5 text-center rounded-xl bg-white/[0.05] text-content-primary text-body-sm font-semibold border border-border-subtle"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

          {/* Real-time Watch & Listen Rooms */}
          <div className="space-y-1">
            <div className="px-2 text-caption font-semibold text-content-muted uppercase tracking-wider">
              Discover
            </div>
            <Link
              href="/shows"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <Tv className="w-5 h-5 text-accent-blue" />
              <span>TV Shows</span>
            </Link>
            <Link
              href="/search"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <Search className="w-5 h-5 text-accent-blue" />
              <span>Search</span>
            </Link>
          </div>

          {/* Real-time Watch & Listen Rooms */}
          <div className="space-y-1">
            <div className="px-2 text-caption font-semibold text-content-muted uppercase tracking-wider">
              Social Entertainment
            </div>
            <Link
              href="/watch-together"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <Video className="w-5 h-5 text-accent-purple" />
              <span>Watch Together</span>
            </Link>
            <Link
              href="/listen-together"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <Radio className="w-5 h-5 text-accent-pink" />
              <span>Listen Together</span>
            </Link>
          </div>

          {/* Library & Notifications */}
          <div className="space-y-1">
            <div className="px-2 text-caption font-semibold text-content-muted uppercase tracking-wider">
              Library & Activity
            </div>
            <Link
              href="/watchlist"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <Bookmark className="w-5 h-5 text-accent-gold" />
              <span>Watchlist</span>
            </Link>
            <Link
              href="/playlists"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
            >
              <ListMusic className="w-5 h-5 text-accent-blue" />
              <span>Playlists</span>
            </Link>
            <button
              onClick={() => {
                setDrawerOpen(false);
                if (onOpenNotifications) onOpenNotifications();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition text-left"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-accent-blue" />
                <span>Notifications</span>
              </div>
              {unreadNotificationCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-accent-blue text-white text-caption font-mono font-bold">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
          </div>

          {/* Account Settings */}
          {isAuthenticated && (
            <div className="space-y-1 pt-2 border-t border-border-subtle">
              <Link
                href="/settings/account"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-content-secondary hover:text-content-primary hover:bg-white/[0.05] transition"
              >
                <Settings className="w-5 h-5 text-content-muted" />
                <span>Account Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-body-md font-medium text-accent-coral hover:bg-accent-coral/10 transition text-left"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};
